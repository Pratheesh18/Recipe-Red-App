import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipeEditorModalService } from '../core/recipe-editor-modal.service';
import { RecipesService } from '../core/recipes.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-recipe-editor-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './recipe-editor-modal.component.html',
  styleUrl: './recipe-editor-modal.component.css'
})
export class RecipeEditorModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly modalService = inject(RecipeEditorModalService);
  private readonly recipesService = inject(RecipesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  protected readonly state = this.modalService.state;
  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingRecipe = signal(false);
  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required]]
  });

  constructor() {
    effect(() => {
      const currentState = this.state();

      if (!currentState.isOpen) {
        this.form.reset();
        this.isLoadingRecipe.set(false);
        return;
      }

      if (currentState.mode === 'create') {
        this.form.reset({
          title: '',
          description: ''
        });
        this.isLoadingRecipe.set(false);
        return;
      }

      if (!currentState.recipeId) {
        return;
      }

      this.isLoadingRecipe.set(true);

      this.recipesService
        .getRecipe(currentState.recipeId)
        .pipe(
          finalize(() => this.isLoadingRecipe.set(false)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (recipe) => {
            this.form.reset({
              title: recipe.title,
              description: recipe.description
            });
          },
          error: () => {
            this.toastService.error('We could not load that recipe for editing.', 'Recipe unavailable');
          }
        });
    });
  }

  protected close(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.modalService.close();
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting() || this.isLoadingRecipe()) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      title: this.form.getRawValue().title ?? '',
      description: this.form.getRawValue().description ?? ''
    };

    const currentState = this.state();
    this.isSubmitting.set(true);

    const request =
      currentState.mode === 'update' && currentState.recipeId
        ? this.recipesService.updateRecipe(currentState.recipeId, payload)
        : this.recipesService.createRecipe(payload);

    request
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.modalService.close();
          this.toastService.success(
            currentState.mode === 'update'
              ? 'Recipe updated successfully.'
              : 'Recipe created successfully and added to the feed.'
          );
          this.modalService.notifyMutation();
        },
        error: (error) => {
          this.toastService.error(
            typeof error?.error === 'string'
              ? error.error
              : currentState.mode === 'update'
                ? 'Recipe update failed. Please try again.'
                : 'Recipe creation failed. Please check your details and backend API.',
            currentState.mode === 'update' ? 'Update failed' : 'Creation failed'
          );
        }
      });
  }
}
