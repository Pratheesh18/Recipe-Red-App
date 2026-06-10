export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  userName: string;
  email: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  userName: string;
  email: string;
}

export interface RecipeFeedItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  author: string;
  voteCount: number;
  hasUpvoted: boolean;
  createdAt: string;
}

export interface CreateRecipeRequest {
  title: string;
  description: string;
}

export interface RecipeDetailsResponse {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  author: string;
  voteCount: number;
  hasUpvoted: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface RecipeVoteResponse {
  recipeId: string;
  voteCount: number;
  hasUpvoted: boolean;
}

export type RecipeEditorMode = 'create' | 'update';

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  email: string | null;
}
