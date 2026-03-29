using DataProtection.Grpc;
using Grpc.Core;
using Grpc.Net.Client;

const string SharedSecret = "DATA_PROTECTION_SHARED_SECRET_2026";
const string MetadataKey = "x-shared-secret";
const string ServerAddress = "https://localhost:5001";

using var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

var httpHandler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback =
        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
};

using var channel = GrpcChannel.ForAddress(ServerAddress, new GrpcChannelOptions
{
    HttpHandler = httpHandler
});

var client = new AgentHub.AgentHubClient(channel);

var metadata = new Metadata
{
    { MetadataKey, SharedSecret }
};

using var call = client.Connect(metadata, cancellationToken: cts.Token);

Console.WriteLine("Connected to Control Center. Streaming...");

var readTask = Task.Run(async () =>
{
    await foreach (var response in call.ResponseStream.ReadAllAsync(cts.Token))
    {
        Console.WriteLine($"[Server] Type={response.Type}, Payload={response.Payload}");
    }
}, cts.Token);

try
{
    while (!cts.Token.IsCancellationRequested)
    {
        await call.RequestStream.WriteAsync(new AgentMessage
        {
            Type = "heartbeat",
            Payload = $"ping at {DateTime.UtcNow:O}"
        }, cts.Token);

        Console.WriteLine("Sent heartbeat.");
        await Task.Delay(TimeSpan.FromSeconds(5), cts.Token);
    }
}
catch (OperationCanceledException) { }
finally
{
    await call.RequestStream.CompleteAsync();
    Console.WriteLine("Disconnected.");
}
