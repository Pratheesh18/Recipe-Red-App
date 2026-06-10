namespace RecipeHub.Models;

public class Vote
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid RecipeId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;

    public Recipe Recipe { get; set; } = null!;
}
