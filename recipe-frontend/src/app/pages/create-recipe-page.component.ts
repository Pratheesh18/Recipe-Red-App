import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { RecipesService } from '../core/recipes.service';

@Component({
  selector: 'app-create-recipe-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-recipe-page.component.html',
  styleUrl: './create-recipe-page.component.css'
})
export class CreateRecipePageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly recipesService = inject(RecipesService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required]]
  });

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.recipesService
      .createRecipe({
        title: title ?? '',
        description: description ?? ''
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/'], {
            queryParams: { created: '1' }
          });
        },
        error: (error) => {
          this.errorMessage.set(
            typeof error?.error === 'string'
              ? error.error
              : 'Recipe creation failed. Please check your details and backend API.'
          );
        }
      });
  }
}
