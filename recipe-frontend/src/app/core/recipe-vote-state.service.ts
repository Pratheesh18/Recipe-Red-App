import { Injectable, signal } from '@angular/core';
import { RecipeVoteResponse } from './models';

@Injectable({ providedIn: 'root' })
export class RecipeVoteStateService {
  readonly latestVote = signal<RecipeVoteResponse | null>(null);
  readonly version = signal(0);

  publish(update: RecipeVoteResponse): void {
    this.latestVote.set(update);
    this.version.update((value) => value + 1);
  }
}
