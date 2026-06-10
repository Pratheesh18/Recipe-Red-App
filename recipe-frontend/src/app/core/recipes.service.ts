import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { apiBaseUrl } from './api.config';
import { CreateRecipeRequest, PagedResponse, RecipeDetailsResponse, RecipeFeedItem, RecipeVoteResponse } from './models';

@Injectable({ providedIn: 'root' })
export class RecipesService {
  constructor(private readonly http: HttpClient) {}

  getRecipes(search = '') {
    let params = new HttpParams()
      .set('page', 1)
      .set('pageSize', 12);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PagedResponse<RecipeFeedItem>>(`${apiBaseUrl}/recipes`, {
      params
    });
  }

  createRecipe(payload: CreateRecipeRequest) {
    return this.http.post<RecipeDetailsResponse>(`${apiBaseUrl}/recipes`, payload);
  }

  getRecipe(id: string) {
    return this.http.get<RecipeDetailsResponse>(`${apiBaseUrl}/recipes/${id}`);
  }

  updateRecipe(id: string, payload: CreateRecipeRequest) {
    return this.http.put<RecipeDetailsResponse>(`${apiBaseUrl}/recipes/${id}`, payload);
  }

  deleteRecipe(id: string) {
    return this.http.delete<void>(`${apiBaseUrl}/recipes/${id}`);
  }

  toggleVote(id: string) {
    return this.http.post<RecipeVoteResponse>(`${apiBaseUrl}/recipes/${id}/vote`, {});
  }
}
