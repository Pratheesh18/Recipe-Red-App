import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipeDetailsResponse } from '../core/models';
import { RecipeDetailsModalService } from '../core/recipe-details-modal.service';
import { RecipesService } from '../core/recipes.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-recipe-details-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './recipe-details-modal.component.html'
})
export class RecipeDetailsModalComponent {
  private readonly modalService = inject(RecipeDetailsModalService);
  private readonly recipesService = inject(RecipesService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = this.modalService.state;
  protected readonly recipe = signal<RecipeDetailsResponse | null>(null);
  protected readonly isLoading = signal(false);

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
  }

  protected close(): void {
    this.modalService.close();
  }
}
