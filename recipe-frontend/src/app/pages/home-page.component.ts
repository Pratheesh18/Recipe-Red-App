import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RecipesService } from '../core/recipes.service';
import { RecipeFeedItem } from '../core/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  protected readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(RecipesService);

  protected readonly recipes = signal<RecipeFeedItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected searchTerm = '';
  protected readonly skeletons = Array.from({ length: 6 }, (_, index) => index);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.successMessage.set(
        params.get('created') === '1' ? 'Recipe created successfully and added to the feed.' : ''
      );
    });

    this.fetchRecipes();
  }

  protected searchRecipes(): void {
    this.fetchRecipes(this.searchTerm);
  }

  private fetchRecipes(search = ''): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.recipesService
      .getRecipes(search)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.recipes.set(response.items);
        },
        error: () => {
          this.errorMessage.set('We could not load recipes right now. Please check that the backend API is running.');
        }
      });
  }
}
