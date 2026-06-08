using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RecipeHub.Data;
using RecipeHub.Models;

namespace RecipeHub.Authentication;

public class RefreshTokenService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly JwtSettings _jwtSettings;

    public RefreshTokenService(
        ApplicationDbContext dbContext,
        IOptions<JwtSettings> jwtOptions)
    {
        _dbContext = dbContext;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<(RefreshToken refreshToken, string rawToken)> CreateAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        var rawToken = GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return (refreshToken, rawToken);
    }

    public async Task<(User user, RefreshToken refreshToken, string rawToken)?> RotateAsync(
        string rawToken,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(rawToken);
        var existingToken = await _dbContext.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);

        if (existingToken is null)
        {
            return null;
        }

        if (existingToken.RevokedAtUtc.HasValue)
        {
            await RevokeTokenChainAsync(existingToken, cancellationToken);
            return null;
        }

        if (existingToken.ExpiresAtUtc <= DateTime.UtcNow)
        {
            existingToken.RevokedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return null;
        }

        var replacementRawToken = GenerateRefreshToken();
        var replacementToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = existingToken.UserId,
            TokenHash = HashToken(replacementRawToken),
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
            CreatedAtUtc = DateTime.UtcNow
        };

        existingToken.RevokedAtUtc = DateTime.UtcNow;
        existingToken.ReplacedByTokenHash = replacementToken.TokenHash;

        _dbContext.RefreshTokens.Add(replacementToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return (existingToken.User, replacementToken, replacementRawToken);
    }

    public async Task RevokeAsync(
        string rawToken,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(rawToken);
        var refreshToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);

        if (refreshToken is null || refreshToken.RevokedAtUtc.HasValue)
        {
            return;
        }

        refreshToken.RevokedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private static string HashToken(string rawToken)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private async Task RevokeTokenChainAsync(
        RefreshToken refreshToken,
        CancellationToken cancellationToken)
    {
        var currentToken = refreshToken;

        while (!string.IsNullOrWhiteSpace(currentToken.ReplacedByTokenHash))
        {
            var nextToken = await _dbContext.RefreshTokens
                .FirstOrDefaultAsync(
                    token => token.TokenHash == currentToken.ReplacedByTokenHash,
                    cancellationToken);

            if (nextToken is null)
            {
                break;
            }

            if (!nextToken.RevokedAtUtc.HasValue)
            {
                nextToken.RevokedAtUtc = DateTime.UtcNow;
            }

            currentToken = nextToken;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
