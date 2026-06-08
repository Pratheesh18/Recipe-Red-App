# RecipeHub

## Overview

RecipeHub is a Reddit-style recipe sharing platform where users can publish recipes, upload recipe images, browse recipes from other users, and upvote recipes they like.

The application demonstrates modern full-stack development using:

- ASP.NET Core Web API (.NET 8)
- Entity Framework Core
- MS SQL Server
- Angular
- Azure Blob Storage
- Azure Functions
- JWT Authentication

---

# Project Goals

Users should be able to:

- Register an account
- Login using JWT authentication
- Create recipes
- Upload recipe images
- Browse recipes from other users
- Search recipes
- Upvote recipes
- Remove their upvote
- Edit their own recipes
- Delete their own recipes

The platform should automatically:

- Store images in Azure Blob Storage
- Compress uploaded images
- Generate thumbnails
- Provide a recipe feed sorted by newest recipes

---

# User Types

## Anonymous User

Can:

- Register
- Login
- View recipe feed
- View recipe details
- Search recipes

Cannot:

- Create recipes
- Edit recipes
- Delete recipes
- Vote on recipes

---

## Authenticated User

Can:

- Create recipes
- Upload recipe images
- Edit own recipes
- Delete own recipes
- Upvote recipes
- Remove upvote
- View profile
- View own recipes

Cannot:

- Edit other users' recipes
- Delete other users' recipes

---

# Technology Stack

## Backend

- ASP.NET Core Web API (.NET 8)
- Entity Framework Core
- SQL Server
- JWT Authentication

## Frontend

- Angular
- Angular Material

## Cloud Services

- Azure Blob Storage
- Azure Functions

---

# High Level Architecture

Angular Frontend
        ↓
ASP.NET Core API
        ↓
SQL Server

ASP.NET Core API
        ↓
Azure Blob Storage
        ↓
Azure Function
        ↓
Compressed Images + Thumbnails

---

# Core Features

## Authentication

### Register

Users can create an account.

### Login

Users can authenticate and receive a JWT token.

### Logout

Frontend removes JWT token.

---

## Recipe Feed

Users can:

- View all recipes
- Browse newest recipes
- Search recipes

---

## Recipe Management

Authenticated users can:

- Create recipes
- Upload images
- Update their recipes
- Delete their recipes

---

## Voting System

Authenticated users can:

- Upvote recipes
- Remove existing upvotes

Voting should behave as a toggle:

- First click → Add vote
- Second click → Remove vote

A user can only have one vote per recipe.

---

# Database Design

## Users

| Column | Type |
|----------|----------|
| Id | uniqueidentifier |
| UserName | nvarchar(100) |
| Email | nvarchar(255) |
| PasswordHash | nvarchar(max) |
| CreatedAt | datetime |

---

## Recipes

| Column | Type |
|----------|----------|
| Id | uniqueidentifier |
| UserId | uniqueidentifier |
| Title | nvarchar(200) |
| Description | nvarchar(max) |
| Ingredients | nvarchar(max) |
| Instructions | nvarchar(max) |
| ImageUrl | nvarchar(max) |
| ThumbnailUrl | nvarchar(max) |
| CreatedAt | datetime |
| UpdatedAt | datetime |

Relationship:

- One User → Many Recipes

---

## Votes

| Column | Type |
|----------|----------|
| Id | uniqueidentifier |
| UserId | uniqueidentifier |
| RecipeId | uniqueidentifier |
| CreatedAt | datetime |

Relationship:

- One User → Many Votes
- One Recipe → Many Votes

Constraint:

```sql
UNIQUE(UserId, RecipeId)
```

This ensures a user can only vote once per recipe.

---

# Entity Relationships

User
 └── Recipes

User
 └── Votes

Recipe
 └── Votes

---

# API Modules

## Authentication

### Register

```http
POST /api/auth/register
```

### Login

```http
POST /api/auth/login
```

Returns JWT token.

---

## Recipes

### Get Feed

```http
GET /api/recipes
```

Returns paginated recipes.

---

### Get Recipe By Id

```http
GET /api/recipes/{id}
```

Returns recipe details.

---

### Create Recipe

```http
POST /api/recipes
```

Authentication required.

---

### Update Recipe

```http
PUT /api/recipes/{id}
```

Only recipe owner allowed.

---

### Delete Recipe

```http
DELETE /api/recipes/{id}
```

Only recipe owner allowed.

---

## Voting

### Toggle Vote

```http
POST /api/recipes/{id}/vote
```

Behavior:

- Vote does not exist → Create vote
- Vote exists → Remove vote

Response:

```json
{
  "recipeId": "guid",
  "voteCount": 10,
  "hasUpvoted": true
}
```

---

# DTOs

## RegisterRequest

```json
{
  "userName": "john",
  "email": "john@example.com",
  "password": "Password123!"
}
```

---

## LoginRequest

```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

---

## CreateRecipeRequest

```json
{
  "title": "Chicken Pasta",
  "description": "Simple pasta recipe",
  "ingredients": "Chicken, Pasta, Cheese",
  "instructions": "Cook and serve"
}
```

---

## RecipeFeedResponse

```json
{
  "id": "guid",
  "title": "Chicken Pasta",
  "thumbnailUrl": "...",
  "author": "john",
  "voteCount": 15,
  "hasUpvoted": true,
  "createdAt": "2026-06-02"
}
```

---

# Azure Blob Storage

Purpose:

Store recipe images.

Containers:

```text
uploads/
compressed/
thumbnails/
```

Only URLs should be stored in SQL Server.

Images should never be stored directly in the database.

---

# Azure Functions

## Blob Trigger Function

Triggered when a new image is uploaded.

Responsibilities:

- Compress image
- Resize image
- Generate thumbnail
- Save optimized files

Output:

```text
compressed/
thumbnails/
```

---

# Security

## Authentication

JWT Bearer Authentication

Protected APIs require:

```http
Authorization: Bearer {token}
```

---

## Authorization

Recipe ownership validation.

Example:

A user can:

- Edit own recipe
- Delete own recipe

A user cannot:

- Edit another user's recipe
- Delete another user's recipe

---

# Non-Functional Requirements

- Async APIs
- Entity Framework Core
- Dependency Injection
- Repository Pattern
- Validation
- Exception Handling Middleware
- Logging
- Pagination
- Clean API responses

---

# Future Enhancements

- Comments
- Recipe Categories
- Favorites
- Trending Recipes
- Notifications
- Email Verification
- Password Reset
- AI Recipe Suggestions

---

# Development Phases

## Phase 1 - Project Setup

- Create .NET Web API
- Configure SQL Server
- Configure Entity Framework Core
- Create database schema

---

## Phase 2 - Authentication

- Register
- Login
- JWT Authentication

---

## Phase 3 - Recipe Management

- Create Recipe
- Get Feed
- Get Recipe Details
- Update Recipe
- Delete Recipe

---

## Phase 4 - Voting System

- Toggle Upvote
- Vote Count
- HasUpvoted Logic

---

## Phase 5 - Azure Blob Storage

- Upload Images
- Store Blob URLs

---

## Phase 6 - Azure Functions

- Image Compression
- Thumbnail Generation

---

## Phase 7 - Angular Frontend

- Authentication Screens
- Recipe Feed
- Recipe Details
- Recipe Creation
- Voting UI
- Profile Page

---

# Success Criteria

The application is considered complete when:

- Users can register and login
- Users can create recipes
- Users can upload recipe images
- Images are stored in Azure Blob Storage
- Azure Functions compress uploaded images
- Users can browse recipes
- Users can upvote recipes
- Users can remove upvotes
- Recipe ownership rules are enforced
- Angular frontend consumes all APIs successfully