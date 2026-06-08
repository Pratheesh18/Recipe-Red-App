import { Injectable, signal } from '@angular/core';
import { RecipeEditorMode } from './models';

export interface RecipeEditorState {
  isOpen: boolean;
  mode: RecipeEditorMode;
  recipeId: string | null;
}

@Injectable({ providedIn: 'root' })
export class RecipeEditorModalService {
  readonly state = signal<RecipeEditorState>({
    isOpen: false,
    mode: 'create',
    recipeId: null
  });

  readonly mutationCount = signal(0);

  openCreate(): void {
    this.state.set({
      isOpen: true,
      mode: 'create',
      recipeId: null
    });
  }

  openUpdate(recipeId: string): void {
    this.state.set({
      isOpen: true,
      mode: 'update',
      recipeId
    });
  }

  close(): void {
    this.state.update((current) => ({
      ...current,
      isOpen: false
    }));
  }

  notifyMutation(): void {
    this.mutationCount.update((count) => count + 1);
  }
}
