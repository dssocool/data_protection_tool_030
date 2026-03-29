using DataProtection.Grpc;
using Grpc.Core;

namespace ControlCenter.Services;

public class AgentService : AgentHub.AgentHubBase
{
    private readonly ILogger<AgentService> _logger;

    public AgentService(ILogger<AgentService> logger)
    {
        _logger = logger;
    }

    public override async Task Connect(
        IAsyncStreamReader<AgentMessage> requestStream,
        IServerStreamWriter<ServerMessage> responseStream,
        ServerCallContext context)
    {
        _logger.LogInformation("Agent connected from {Peer}", context.Peer);

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
