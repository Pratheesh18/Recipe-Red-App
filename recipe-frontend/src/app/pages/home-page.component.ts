import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipesService } from '../core/recipes.service';
import { RecipeFeedItem } from '../core/models';
import { AuthService } from '../core/auth.service';
import { RecipeDetailsModalService } from '../core/recipe-details-modal.service';
import { RecipeEditorModalService } from '../core/recipe-editor-modal.service';
import { RecipeVoteStateService } from '../core/recipe-vote-state.service';
import { ToastService } from '../core/toast.service';

const searchDebounceMs = 300;

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  protected readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recipeDetailsModalService = inject(RecipeDetailsModalService);
  private readonly recipeEditorModalService = inject(RecipeEditorModalService);
  private readonly recipeVoteStateService = inject(RecipeVoteStateService);
  private readonly recipesService = inject(RecipesService);
  private readonly toastService = inject(ToastService);

  protected readonly recipes = signal<RecipeFeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSearching = signal(false);
  protected readonly votingRecipeIds = signal<Record<string, boolean>>({});
  protected searchTerm = '';
  protected readonly skeletons = Array.from({ length: 6 }, (_, index) => index);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.bindRouteSearch();
    this.bindDebouncedSearch();

    effect(() => {
      const mutationCount = this.recipeEditorModalService.mutationCount();

      if (mutationCount === 0) {
        return;
      }

      untracked(() => {
        this.fetchRecipes(this.searchTerm);
      });
    });

    effect(() => {
      const version = this.recipeVoteStateService.version();

      if (version === 0) {
        return;
      }

      const latestVote = this.recipeVoteStateService.latestVote();
      if (!latestVote) {
        return;
      }

      untracked(() => {
        this.recipes.update((recipes) =>
          recipes.map((recipe) =>
            recipe.id === latestVote.recipeId
              ? {
                ...recipe,
                voteCount: latestVote.voteCount,
                hasUpvoted: latestVote.hasUpvoted
              }
              : recipe
          )
        );
      });
    });
  }

  protected searchRecipes(): void {
    this.runSearch(this.searchTerm);
  }

  protected onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.searchInput$.next(term);
  }

  protected clearSearch(): void {
    this.searchTerm = '';
    this.runSearch('');
  }

  protected openCreateRecipeModal(): void {
    this.recipeEditorModalService.openCreate();
  }

  protected openRecipeDetailsModal(recipeId: string): void {
    this.recipeDetailsModalService.open(recipeId);
  }

  protected isVotePending(recipeId: string): boolean {
    return Boolean(this.votingRecipeIds()[recipeId]);
  }

  protected toggleVote(recipe: RecipeFeedItem, event: Event): void {
    event.stopPropagation();

    if (this.isVotePending(recipe.id)) {
      return;
    }

    if (!this.authService.state().isAuthenticated) {
      this.toastService.info('Log in to vote on recipes.', 'Login required');
      return;
    }

    this.setVotePending(recipe.id, true);

    this.recipesService
      .toggleVote(recipe.id)
      .pipe(finalize(() => this.setVotePending(recipe.id, false)))
      .subscribe({
        next: (response) => {
          this.recipeVoteStateService.publish(response);
        },
        error: () => {
          this.toastService.error('We could not update your vote right now.', 'Vote failed');
        }
      });
  }

  private bindRouteSearch(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const search = params.get('search')?.trim() ?? '';
        this.searchTerm = search;
        this.fetchRecipes(search);
      });
  }

  private bindDebouncedSearch(): void {
    this.searchInput$
      .pipe(
        debounceTime(searchDebounceMs),
        distinctUntilChanged(),
        switchMap((term) => {
          this.isSearching.set(true);

          return this.updateRouteSearch(term)
            .then(() => term)
            .finally(() => this.isSearching.set(false));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private runSearch(term: string): void {
    this.isSearching.set(true);

    void this.updateRouteSearch(term)
      .finally(() => this.isSearching.set(false));
  }

  private fetchRecipes(search = ''): void {
    this.isLoading.set(true);

    this.recipesService
      .getRecipes(search)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.recipes.set(response.items);
        },
        error: () => {
          this.toastService.error(
            'We could not load recipes right now. Please check that the backend API is running.',
            'Feed unavailable'
          );
        }
      });
  }

  private async updateRouteSearch(term: string): Promise<void> {
    const normalizedTerm = term.trim();

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: normalizedTerm ? { search: normalizedTerm } : { search: null },
      queryParamsHandling: 'merge'
    });
  }

  private setVotePending(recipeId: string, isPending: boolean): void {
    this.votingRecipeIds.update((current) => {
      if (isPending) {
        return {
          ...current,
          [recipeId]: true
        };
      }

      const { [recipeId]: _, ...rest } = current;
      return rest;
    });
  }
}
