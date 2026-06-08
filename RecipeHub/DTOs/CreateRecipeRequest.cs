using System.ComponentModel.DataAnnotations;

namespace RecipeHub.DTOs;

public class CreateRecipeRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}
