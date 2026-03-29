using System.Text.Json;
using System.Text.Json.Serialization;
using DataProtection.Grpc;
using Grpc.Core;

namespace ControlCenter.Services;

public sealed class AgentConnectionRegistry : IAgentConnectionRegistry
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly object _sync = new();
    private readonly Dictionary<(string Oid, string Tid), AgentGrpcConnection> _connections = new();

    public AgentGrpcConnection RegisterConnection(string oid, string tid, IServerStreamWriter<ServerMessage> responseStream)
    {
        var conn = new AgentGrpcConnection(responseStream);
        var key = (oid, tid);
        lock (_sync)
        {
            if (_connections.TryGetValue(key, out var oldConn))
                oldConn.FailAllPending("Replaced by a new agent connection.");
            _connections[key] = conn;
        }

        return conn;
    }

    public void TryUnregisterConnection(string oid, string tid, Guid connectionId)
    {
        var key = (oid, tid);
        lock (_sync)
        {
            if (!_connections.TryGetValue(key, out var current) || current.Id != connectionId)
                return;
            _connections.Remove(key);
            current.FailAllPending("Agent disconnected.");
        }
    }

    public async Task<(bool ok, string message)> SendSqlValidateAsync(
        string oid,
        string tid,
        SqlValidateRequestBody body,
        CancellationToken cancellationToken)
    {
        AgentGrpcConnection conn;
        lock (_sync)
        {
            if (!_connections.TryGetValue((oid, tid), out conn!))
                return (false, "Agent is not connected. Ensure the agent is running and linked to this session.");
        }

        var correlationId = Guid.NewGuid().ToString("N");
        var responseTask = conn.AddPendingValidate(correlationId);

        var payload = JsonSerializer.Serialize(
            new
            {
                correlationId,
                body.ServerName,
                body.Authentication,
                body.UserName,
                body.Password,
                body.DatabaseName,
                body.Encrypt,
                body.TrustServerCertificate,
            },
            JsonOptions);

        try
        {
            await conn.WriteAsync(
                new ServerMessage { Type = "sql_validate_request", Payload = payload },
                cancellationToken);
        }
        catch (Exception ex)
        {
            conn.RemovePendingValidate(correlationId);
            return (false, $"Could not reach agent: {ex.Message}");
        }

        try
        {
            var result = await responseTask.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            return (result.Ok, result.Message);
        }
        catch (TimeoutException)
        {
            conn.RemovePendingValidate(correlationId);
            return (false, "Validation timed out.");
        }
        catch (OperationCanceledException)
        {
            conn.RemovePendingValidate(correlationId);
            throw;
        }
    }

    public void HandleSqlValidateResponse(string oid, string tid, string correlationId, bool ok, string message)
    {
        lock (_sync)
        {
            if (!_connections.TryGetValue((oid, tid), out var conn))
                return;
            conn.CompletePendingValidate(correlationId, ok, message);
        }
    }
}
