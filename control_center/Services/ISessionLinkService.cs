namespace ControlCenter.Services;

public sealed record AgentSession(string Oid, string Tid);

public interface ISessionLinkService
{
    /// <summary>Registers a new session and returns an opaque token for the URL path.</summary>
    string RegisterSession(string oid, string tid);

    /// <summary>Resolves a token if still valid.</summary>
    bool TryGetSession(string token, out AgentSession? session);
}
