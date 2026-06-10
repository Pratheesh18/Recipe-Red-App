namespace RecipeHub.DTOs;

public class RecipeVoteResponse
{
    public Guid RecipeId { get; set; }

    public int VoteCount { get; set; }

    public bool HasUpvoted { get; set; }
}
