import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RecipesService } from '../core/recipes.service';
import { RecipeFeedItem } from '../core/models';
import { AuthService } from '../core/auth.service';
import { RecipeDetailsModalService } from '../core/recipe-details-modal.service';
import { RecipeEditorModalService } from '../core/recipe-editor-modal.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  protected readonly authService = inject(AuthService);
  private readonly recipeDetailsModalService = inject(RecipeDetailsModalService);
  private readonly recipeEditorModalService = inject(RecipeEditorModalService);
  private readonly recipesService = inject(RecipesService);
  private readonly toastService = inject(ToastService);

  protected readonly recipes = signal<RecipeFeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected searchTerm = '';
  protected readonly skeletons = Array.from({ length: 6 }, (_, index) => index);

  constructor() {
    effect(() => {
      const mutationCount = this.recipeEditorModalService.mutationCount();

      if (mutationCount === 0) {
        return;
      }

      untracked(() => {
        this.fetchRecipes(this.searchTerm);
      });
    });

    this.fetchRecipes();
  }

  protected searchRecipes(): void {
    this.fetchRecipes(this.searchTerm);
  }

  protected openCreateRecipeModal(): void {
    this.recipeEditorModalService.openCreate();
  }

  protected openRecipeDetailsModal(recipeId: string): void {
    this.recipeDetailsModalService.open(recipeId);
  }

  protected openUpdateRecipeModal(recipeId: string): void {
    this.recipeEditorModalService.openUpdate(recipeId);
  }

  protected isRecipeOwner(recipe: RecipeFeedItem): boolean {
    return this.authService.state().userName === recipe.author;
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
}
