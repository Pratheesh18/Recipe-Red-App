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

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

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

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.Property(token => token.TokenHash)
                .HasMaxLength(64);

            entity.Property(token => token.ReplacedByTokenHash)
                .HasMaxLength(64);

            entity.HasIndex(token => token.TokenHash)
                .IsUnique();

            entity.HasOne(token => token.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);
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
