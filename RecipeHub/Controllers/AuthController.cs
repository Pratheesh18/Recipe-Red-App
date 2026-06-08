using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RecipeHub.Authentication;
using RecipeHub.Data;
using RecipeHub.DTOs;
using RecipeHub.Models;

namespace RecipeHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly JwtTokenGenerator _jwtTokenGenerator;
    private readonly JwtSettings _jwtSettings;

    public AuthController(
        ApplicationDbContext dbContext,
        JwtTokenGenerator jwtTokenGenerator,
        IOptions<JwtSettings> jwtOptions)
    {
        _dbContext = dbContext;
        _jwtTokenGenerator = jwtTokenGenerator;
        _jwtSettings = jwtOptions.Value;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedUserName = request.Username.Trim();

        var userExists = await _dbContext.Users.AnyAsync(user =>
            user.Email.ToLower() == normalizedEmail ||
            user.UserName.ToLower() == normalizedUserName.ToLower());

        if (userExists)
        {
            return Conflict("A user with the same email or username already exists.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            UserName = normalizedUserName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        return Ok(new RegisterResponse
        {
            Message = "User registered successfully",
            UserId = user.Id,
            UserName = user.UserName,
            Email = user.Email
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var credential = request.Email.Trim();
        var normalizedCredential = credential.ToLowerInvariant();

        var user = await _dbContext.Users.FirstOrDefaultAsync(existingUser =>
            existingUser.Email.ToLower() == normalizedCredential ||
            existingUser.UserName.ToLower() == normalizedCredential);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid username/email or password.");
        }

        return Ok(CreateAuthResponse(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<object>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var user = await _dbContext.Users
            .Where(existingUser => existingUser.Id == parsedUserId)
            .Select(existingUser => new
            {
                existingUser.Id,
                existingUser.UserName,
                existingUser.Email,
                existingUser.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        return new AuthResponse
        {
            Token = _jwtTokenGenerator.GenerateToken(user),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
            UserId = user.Id,
            UserName = user.UserName,
            Email = user.Email
        };
    }
}
