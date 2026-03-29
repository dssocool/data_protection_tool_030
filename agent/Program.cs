using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using Agent;
using Azure.Core;
using Azure.Identity;
using DataProtection.Grpc;
using Grpc.Core;
using Grpc.Net.Client;

const string SessionUrlMessageType = "session_url";
const string SqlValidateRequestType = "sql_validate_request";
const string SharedSecret = "DATA_PROTECTION_SHARED_SECRET_2026";
const string MetadataKey = "x-shared-secret";
const string ServerAddress = "http://localhost:5001";

var mode = GetArg(args, "--mode", "native");
var env = GetArg(args, "--env", "dev");

Console.WriteLine($"Agent starting in mode={mode}, env={env}");

if (mode == "cloud")
{
    Console.WriteLine("Cloud mode is not yet implemented.");
    return;
}

if (mode != "native")
{
    Console.Error.WriteLine($"Unknown mode: {mode}. Supported: native, cloud");
    return;
}

string oid, tid;

if (env == "prod")
{
    Console.WriteLine("Acquiring Azure identity token...");
    var credential = new DefaultAzureCredential();
    var tokenResult = await credential.GetTokenAsync(
        new TokenRequestContext(new[] { "https://graph.microsoft.com/.default" }));

    var handler = new JwtSecurityTokenHandler();
    var jwt = handler.ReadJwtToken(tokenResult.Token);

    oid = jwt.Claims.FirstOrDefault(c => c.Type == "oid")?.Value
        ?? throw new InvalidOperationException("Token does not contain an 'oid' claim.");
    tid = jwt.Claims.FirstOrDefault(c => c.Type == "tid")?.Value
        ?? throw new InvalidOperationException("Token does not contain a 'tid' claim.");

    Console.WriteLine($"Authenticated via Azure Identity. oid={oid}, tid={tid}");
}
else if (env == "dev")
{
    oid = Environment.UserName;
    tid = GetLocalIpAddress();
    Console.WriteLine($"Dev identity: oid={oid}, tid={tid}");
}
else
{
    Console.Error.WriteLine($"Unknown env: {env}. Supported: dev, prod");
    return;
}

using var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cts.Cancel();
};

AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);

using var channel = GrpcChannel.ForAddress(ServerAddress);

var client = new AgentHub.AgentHubClient(channel);

var metadata = new Metadata
{
    { MetadataKey, SharedSecret },
    { "x-agent-oid", oid },
    { "x-agent-tid", tid }
};

const int centerRetrySeconds = 10;
AsyncDuplexStreamingCall<AgentMessage, ServerMessage>? call = null;
while (!cts.Token.IsCancellationRequested)
{
    AsyncDuplexStreamingCall<AgentMessage, ServerMessage>? attempt = null;
    try
    {
        attempt = client.Connect(metadata, cancellationToken: cts.Token);
        await attempt.RequestStream.WriteAsync(new AgentMessage
        {
            Type = "heartbeat",
            Payload = $"ping at {DateTime.UtcNow:O}"
        }, cts.Token);
        call = attempt;
        break;
    }
    catch (OperationCanceledException)
    {
        attempt?.Dispose();
        return;
    }
    catch (Exception ex)
    {
        attempt?.Dispose();
        if (!IsTransientConnectFailure(ex))
        {
            Console.Error.WriteLine($"Cannot connect to Control Center: {ex.Message}");
            return;
        }

        Console.WriteLine($"Control Center unreachable ({ex.Message}). Retrying in {centerRetrySeconds}s...");
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(centerRetrySeconds), cts.Token);
        }
        catch (OperationCanceledException)
        {
            return;
        }
    }
}

if (call is null)
    return;

using (call)
{
    Console.WriteLine("Connected to Control Center. Streaming...");

    var sessionUrlGate = 0;
    var readTask = Task.Run(async () =>
    {
        await foreach (var response in call.ResponseStream.ReadAllAsync(cts.Token))
        {
            if (string.Equals(response.Type, SessionUrlMessageType, StringComparison.OrdinalIgnoreCase))
            {
                if (Interlocked.CompareExchange(ref sessionUrlGate, 1, 0) == 0
                    && !string.IsNullOrWhiteSpace(response.Payload))
                    DisplaySession.OpenBrowserOrPrint(response.Payload);
                continue;
            }

            if (string.Equals(response.Type, SqlValidateRequestType, StringComparison.OrdinalIgnoreCase))
            {
                var (corrId, ok, msg) = await SqlValidate.TryValidateAsync(response.Payload ?? "", cts.Token);
                if (!string.IsNullOrEmpty(corrId))
                {
                    await call.RequestStream.WriteAsync(new AgentMessage
                    {
                        Type = "sql_validate_response",
                        Payload = SqlValidate.BuildResponseJson(corrId, ok, msg)
                    }, cts.Token);
                }

                continue;
            }

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
}

static bool IsTransientConnectFailure(Exception ex)
{
    if (ex is AggregateException agg)
    {
        return agg.Flatten().InnerExceptions.Any(IsTransientConnectFailure);
    }

    return ex switch
    {
        RpcException rpc => rpc.StatusCode is StatusCode.Unavailable
            or StatusCode.DeadlineExceeded
            or StatusCode.Internal,
        HttpRequestException => true,
        SocketException => true,
        IOException => true,
        _ => false
    };
}

static string GetArg(string[] args, string name, string defaultValue)
{
    for (int i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            return args[i + 1];
    }
    return defaultValue;
}

static string GetLocalIpAddress()
{
    try
    {
        using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
        socket.Connect("8.8.8.8", 80);
        if (socket.LocalEndPoint is IPEndPoint endPoint)
            return endPoint.Address.ToString();
    }
    catch { }

    return "127.0.0.1";
}
