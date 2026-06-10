import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { RecipeDetailsResponse } from '../core/models';
import { RecipeDetailsModalService } from '../core/recipe-details-modal.service';
import { RecipeEditorModalService } from '../core/recipe-editor-modal.service';
import { RecipeVoteStateService } from '../core/recipe-vote-state.service';
import { RecipesService } from '../core/recipes.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-recipe-details-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './recipe-details-modal.component.html'
})
export class RecipeDetailsModalComponent {
  protected readonly authService = inject(AuthService);
  private readonly modalService = inject(RecipeDetailsModalService);
  private readonly recipeEditorModalService = inject(RecipeEditorModalService);
  private readonly recipeVoteStateService = inject(RecipeVoteStateService);
  private readonly recipesService = inject(RecipesService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = this.modalService.state;
  protected readonly recipe = signal<RecipeDetailsResponse | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isVoting = signal(false);

  constructor() {
    effect(() => {
      const currentState = this.state();

      if (!currentState.isOpen || !currentState.recipeId) {
        this.recipe.set(null);
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);

      this.recipesService
        .getRecipe(currentState.recipeId)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (recipe) => {
            this.recipe.set(recipe);
          },
          error: () => {
            this.modalService.close();
            this.toastService.error('We could not load this recipe right now.', 'Recipe unavailable');
          }
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

      this.recipe.update((currentRecipe) =>
        currentRecipe && currentRecipe.id === latestVote.recipeId
          ? {
            ...currentRecipe,
            voteCount: latestVote.voteCount,
            hasUpvoted: latestVote.hasUpvoted
          }
          : currentRecipe
      );
    });
  }

  protected close(): void {
    if (this.isDeleting() || this.isVoting()) {
      return;
    }

    this.modalService.close();
  }

  protected isRecipeOwner(recipe: RecipeDetailsResponse): boolean {
    return this.authService.state().userName === recipe.author;
  }

  protected openUpdateRecipeModal(recipeId: string): void {
    this.modalService.close();
    this.recipeEditorModalService.openUpdate(recipeId);
  }

  protected deleteRecipe(recipeId: string): void {
    if (this.isDeleting()) {
      return;
    }

    const confirmed = window.confirm('Delete this recipe? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.isDeleting.set(true);

    this.recipesService
      .deleteRecipe(recipeId)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.modalService.close();
          this.recipeEditorModalService.notifyMutation();
          this.toastService.success('Recipe deleted successfully.', 'Recipe deleted');
        },
        error: () => {
          this.toastService.error('We could not delete this recipe right now.', 'Delete failed');
        }
      });
  }

  protected toggleVote(recipe: RecipeDetailsResponse): void {
    if (this.isVoting()) {
      return;
    }

    if (!this.authService.state().isAuthenticated) {
      this.toastService.info('Log in to vote on recipes.', 'Login required');
      return;
    }

    this.isVoting.set(true);

    this.recipesService
      .toggleVote(recipe.id)
      .pipe(finalize(() => this.isVoting.set(false)))
      .subscribe({
        next: (response) => {
          this.recipeVoteStateService.publish(response);
        },
        error: () => {
          this.toastService.error('We could not update your vote right now.', 'Vote failed');
        }
      });
  }
}
