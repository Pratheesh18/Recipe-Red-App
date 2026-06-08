namespace RecipeHub.DTOs;

public class RegisterResponse
{
    public string Message { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;
}
