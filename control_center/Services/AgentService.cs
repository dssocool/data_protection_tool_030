using System.Text.Json;
using ControlCenter.Options;
using DataProtection.Grpc;
using Grpc.Core;
using Microsoft.Extensions.Options;

namespace ControlCenter.Services;

public class AgentService : AgentHub.AgentHubBase
{
    public const string SessionUrlMessageType = "session_url";
    public const string SqlValidateResponseType = "sql_validate_response";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ILogger<AgentService> _logger;
    private readonly ControlCenterOptions _options;
    private readonly ISessionLinkService _sessionLinks;
    private readonly IAgentConnectionRegistry _agentRegistry;

    public AgentService(
        ILogger<AgentService> logger,
        IOptions<ControlCenterOptions> options,
        ISessionLinkService sessionLinks,
        IAgentConnectionRegistry agentRegistry)
    {
        _logger = logger;
        _options = options.Value;
        _sessionLinks = sessionLinks;
        _agentRegistry = agentRegistry;
    }

    public override async Task Connect(
        IAsyncStreamReader<AgentMessage> requestStream,
        IServerStreamWriter<ServerMessage> responseStream,
        ServerCallContext context)
    {
        var oid = context.RequestHeaders.GetValue("x-agent-oid") ?? "unknown";
        var tid = context.RequestHeaders.GetValue("x-agent-tid") ?? "unknown";
        _logger.LogInformation("Agent connected from {Peer} (oid={Oid}, tid={Tid})", context.Peer, oid, tid);

        var connection = _agentRegistry.RegisterConnection(oid, tid, responseStream);

        var token = _sessionLinks.RegisterSession(oid, tid);
        var baseUrl = _options.PublicBaseUrl.TrimEnd('/');
        var sessionUrl = $"{baseUrl}/session/{token}";
        await connection.WriteAsync(new ServerMessage
        {
            Type = SessionUrlMessageType,
            Payload = sessionUrl
        }, context.CancellationToken);

        try
        {
            await foreach (var message in requestStream.ReadAllAsync(context.CancellationToken))
            {
                _logger.LogInformation("Received message: Type={Type}", message.Type);

                if (string.Equals(message.Type, SqlValidateResponseType, StringComparison.OrdinalIgnoreCase))
                {
                    HandleSqlValidateResponseFromAgent(oid, tid, message.Payload);
                    continue;
                }

                await connection.WriteAsync(new ServerMessage
                {
                    Type = "ack",
                    Payload = $"Received: {message.Type}"
                }, context.CancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Agent disconnected from {Peer}", context.Peer);
        }
        finally
        {
            _agentRegistry.TryUnregisterConnection(oid, tid, connection.Id);
        }
    }

    private void HandleSqlValidateResponseFromAgent(string oid, string tid, string payload)
    {
        try
        {
            var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payload) ? "{}" : payload);
            var root = doc.RootElement;
            var correlationId = root.TryGetProperty("correlationId", out var c) ? c.GetString() : null;
            if (string.IsNullOrEmpty(correlationId))
                return;
            var ok = root.TryGetProperty("ok", out var o) && o.ValueKind == JsonValueKind.True;
            var message = root.TryGetProperty("message", out var m) ? m.GetString() ?? "" : "";
            _agentRegistry.HandleSqlValidateResponse(oid, tid, correlationId, ok, message);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid sql_validate_response payload");
        }
    }
}
