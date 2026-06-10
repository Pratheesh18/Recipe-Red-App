using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeHub.Data;
using RecipeHub.DTOs;
using RecipeHub.Models;

namespace RecipeHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecipesController : ControllerBase
{
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 10;
    private const int MaxPageSize = 50;

    private readonly ApplicationDbContext _dbContext;

    public RecipesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResponse<RecipeFeedItemResponse>>> GetRecipes(
        [FromQuery] int page = DefaultPage,
        [FromQuery] int pageSize = DefaultPageSize,
        [FromQuery] string? search = null)
    {
        var currentUserId = GetCurrentUserId();
        var normalizedSearch = string.IsNullOrWhiteSpace(search)
            ? null
            : search.Trim().ToLower();
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _dbContext.Recipes
            .AsNoTracking()
            .Include(recipe => recipe.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(recipe =>
                recipe.Title.ToLower().Contains(normalizedSearch) ||
                recipe.Description.ToLower().Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(recipe => recipe.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(recipe => new RecipeFeedItemResponse
            {
                Id = recipe.Id,
                Title = recipe.Title,
                ThumbnailUrl = recipe.ThumbnailUrl,
                Author = recipe.User.UserName,
                VoteCount = recipe.Votes.Count(),
                HasUpvoted = currentUserId.HasValue && recipe.Votes.Any(vote => vote.UserId == currentUserId.Value),
                CreatedAt = recipe.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResponse<RecipeFeedItemResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<RecipeDetailsResponse>> GetRecipe(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        var recipe = await _dbContext.Recipes
            .AsNoTracking()
            .Include(existingRecipe => existingRecipe.User)
            .Where(existingRecipe => existingRecipe.Id == id)
            .Select(existingRecipe => new RecipeDetailsResponse
            {
                Id = existingRecipe.Id,
                Title = existingRecipe.Title,
                Description = existingRecipe.Description,
                ImageUrl = existingRecipe.ImageUrl,
                ThumbnailUrl = existingRecipe.ThumbnailUrl,
                Author = existingRecipe.User.UserName,
                VoteCount = existingRecipe.Votes.Count(),
                HasUpvoted = currentUserId.HasValue && existingRecipe.Votes.Any(vote => vote.UserId == currentUserId.Value),
                CreatedAt = existingRecipe.CreatedAt,
                UpdatedAt = existingRecipe.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (recipe is null)
        {
            return NotFound();
        }

        return Ok(recipe);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<RecipeDetailsResponse>> CreateRecipe(CreateRecipeRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Recipes.Add(recipe);
        await _dbContext.SaveChangesAsync();

        var author = await _dbContext.Users
            .Where(user => user.Id == userId.Value)
            .Select(user => user.UserName)
            .FirstAsync();

        return CreatedAtAction(
            nameof(GetRecipe),
            new { id = recipe.Id },
            MapToDetailsResponse(recipe, author));
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<RecipeDetailsResponse>> UpdateRecipe(Guid id, UpdateRecipeRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var recipe = await _dbContext.Recipes
            .Include(existingRecipe => existingRecipe.User)
            .FirstOrDefaultAsync(existingRecipe => existingRecipe.Id == id);

        if (recipe is null)
        {
            return NotFound();
        }

        if (recipe.UserId != userId.Value)
        {
            return Forbid();
        }

        recipe.Title = request.Title.Trim();
        recipe.Description = request.Description.Trim();
        recipe.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(MapToDetailsResponse(recipe, recipe.User.UserName));
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteRecipe(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var recipe = await _dbContext.Recipes
            .FirstOrDefaultAsync(existingRecipe => existingRecipe.Id == id);

        if (recipe is null)
        {
            return NotFound();
        }

        if (recipe.UserId != userId.Value)
        {
            return Forbid();
        }

        _dbContext.Recipes.Remove(recipe);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:guid}/vote")]
    [Authorize]
    public async Task<ActionResult<RecipeVoteResponse>> ToggleVote(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var recipeExists = await _dbContext.Recipes
            .AnyAsync(recipe => recipe.Id == id);

        if (!recipeExists)
        {
            return NotFound();
        }

        var existingVote = await _dbContext.Votes
            .FirstOrDefaultAsync(vote => vote.RecipeId == id && vote.UserId == userId.Value);

        bool hasUpvoted;

        if (existingVote is null)
        {
            _dbContext.Votes.Add(new Vote
            {
                Id = Guid.NewGuid(),
                RecipeId = id,
                UserId = userId.Value,
                CreatedAt = DateTime.UtcNow
            });
            hasUpvoted = true;
        }
        else
        {
            _dbContext.Votes.Remove(existingVote);
            hasUpvoted = false;
        }

        await _dbContext.SaveChangesAsync();

        var voteCount = await _dbContext.Votes
            .CountAsync(vote => vote.RecipeId == id);

        return Ok(new RecipeVoteResponse
        {
            RecipeId = id,
            VoteCount = voteCount,
            HasUpvoted = hasUpvoted
        });
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }

    private static RecipeDetailsResponse MapToDetailsResponse(Recipe recipe, string author)
    {
        return new RecipeDetailsResponse
        {
            Id = recipe.Id,
            Title = recipe.Title,
            Description = recipe.Description,
            ImageUrl = recipe.ImageUrl,
            ThumbnailUrl = recipe.ThumbnailUrl,
            Author = author,
            VoteCount = recipe.Votes.Count,
            HasUpvoted = false,
            CreatedAt = recipe.CreatedAt,
            UpdatedAt = recipe.UpdatedAt
        };
    }
}
