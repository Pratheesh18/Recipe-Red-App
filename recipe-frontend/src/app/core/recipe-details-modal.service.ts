import { Injectable, signal } from '@angular/core';

export interface RecipeDetailsModalState {
  isOpen: boolean;
  recipeId: string | null;
}

@Injectable({ providedIn: 'root' })
export class RecipeDetailsModalService {
  readonly state = signal<RecipeDetailsModalState>({
    isOpen: false,
    recipeId: null
  });

  open(recipeId: string): void {
    this.state.set({
      isOpen: true,
      recipeId
    });
  }

  close(): void {
    this.state.set({
      isOpen: false,
      recipeId: null
    });
  }
}
