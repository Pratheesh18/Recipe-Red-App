namespace RecipeHub.DTOs;

public class RecipeDetailsResponse
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public string? ThumbnailUrl { get; set; }

    public string Author { get; set; } = string.Empty;

    public int VoteCount { get; set; }

    public bool HasUpvoted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
