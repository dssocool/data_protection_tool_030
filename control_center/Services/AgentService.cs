using ControlCenter.Options;
using DataProtection.Grpc;
using Grpc.Core;
using Microsoft.Extensions.Options;

namespace ControlCenter.Services;

public class AgentService : AgentHub.AgentHubBase
{
    public const string SessionUrlMessageType = "session_url";

    private readonly ILogger<AgentService> _logger;
    private readonly ControlCenterOptions _options;
    private readonly ISessionLinkService _sessionLinks;

    public AgentService(
        ILogger<AgentService> logger,
        IOptions<ControlCenterOptions> options,
        ISessionLinkService sessionLinks)
    {
        _logger = logger;
        _options = options.Value;
        _sessionLinks = sessionLinks;
    }

    public override async Task Connect(
        IAsyncStreamReader<AgentMessage> requestStream,
        IServerStreamWriter<ServerMessage> responseStream,
        ServerCallContext context)
    {
        var oid = context.RequestHeaders.GetValue("x-agent-oid") ?? "unknown";
        var tid = context.RequestHeaders.GetValue("x-agent-tid") ?? "unknown";
        _logger.LogInformation("Agent connected from {Peer} (oid={Oid}, tid={Tid})", context.Peer, oid, tid);

        var token = _sessionLinks.RegisterSession(oid, tid);
        var baseUrl = _options.PublicBaseUrl.TrimEnd('/');
        var sessionUrl = $"{baseUrl}/session/{token}";
        await responseStream.WriteAsync(new ServerMessage
        {
            Type = SessionUrlMessageType,
            Payload = sessionUrl
        }, context.CancellationToken);

        try
        {
            await foreach (var message in requestStream.ReadAllAsync(context.CancellationToken))
            {
                _logger.LogInformation("Received message: Type={Type}", message.Type);

                await responseStream.WriteAsync(new ServerMessage
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
    }
}
