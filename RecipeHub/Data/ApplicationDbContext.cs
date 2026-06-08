using Microsoft.EntityFrameworkCore;
using RecipeHub.Models;

namespace RecipeHub.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Recipe> Recipes => Set<Recipe>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.UserName)
                .HasMaxLength(100);

            entity.Property(user => user.Email)
                .HasMaxLength(255);
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.Property(recipe => recipe.Title)
                .HasMaxLength(200);

            entity.HasOne(recipe => recipe.User)
                .WithMany(user => user.Recipes)
                .HasForeignKey(recipe => recipe.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
