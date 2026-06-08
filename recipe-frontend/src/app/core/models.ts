export interface AuthResponse {
  token: string;
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

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userName: string | null;
  email: string | null;
}
