import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { RecipeDetailsModalComponent } from './shared/recipe-details-modal.component';
import { RecipeEditorModalComponent } from './shared/recipe-editor-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RecipeEditorModalComponent, RecipeDetailsModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly authService = inject(AuthService);

  protected readonly authState = this.authService.state;

  constructor() {
    this.authService.restoreSession();
  }

  protected logout(): void {
    this.authService.logout();
  }
}
