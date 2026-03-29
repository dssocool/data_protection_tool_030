using System.Security.Cryptography;
using ControlCenter.Options;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ControlCenter.Services;

public sealed class SessionLinkService : ISessionLinkService
{
    private const string CacheKeyPrefix = "agent-session:";
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _ttl;

    public SessionLinkService(IMemoryCache cache, IOptions<ControlCenterOptions> options)
    {
        _cache = cache;
        _ttl = TimeSpan.FromMinutes(Math.Clamp(options.Value.SessionTtlMinutes, 1, 1440));
    }

    public string RegisterSession(string oid, string tid)
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        var token = ToBase64Url(bytes);
        var key = CacheKeyPrefix + token;
        _cache.Set(key, new AgentSession(oid, tid), new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _ttl
        });
        return token;
    }

    public bool TryGetSession(string token, out AgentSession? session)
    {
        session = null;
        if (string.IsNullOrWhiteSpace(token))
            return false;
        if (!_cache.TryGetValue(CacheKeyPrefix + token.Trim(), out var obj) || obj is not AgentSession s)
            return false;
        session = s;
        return true;
    }

    private static string ToBase64Url(ReadOnlySpan<byte> data)
    {
        return Convert.ToBase64String(data)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
