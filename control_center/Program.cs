using ControlCenter.Auth;
using ControlCenter.Options;
using ControlCenter.Services;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = HttpLoggingFields.All
        & ~(HttpLoggingFields.RequestBody | HttpLoggingFields.ResponseBody);
    if (builder.Environment.IsDevelopment())
    {
        options.LoggingFields |= HttpLoggingFields.RequestBody | HttpLoggingFields.ResponseBody;
    }

    foreach (var h in new[]
             {
                 "Host", "User-Agent", "Accept", "Content-Type", "Content-Length",
                 "x-agent-oid", "x-agent-tid", "grpc-status", "grpc-message",
             })
    {
        options.RequestHeaders.Add(h);
        options.ResponseHeaders.Add(h);
    }
});

builder.Services.AddMemoryCache();
builder.Services.Configure<ControlCenterOptions>(
    builder.Configuration.GetSection(ControlCenterOptions.SectionName));
builder.Services.AddSingleton<ISessionLinkService, SessionLinkService>();
builder.Services.AddSingleton<IAgentConnectionRegistry, AgentConnectionRegistry>();

builder.Services.AddGrpc(options =>
{
    options.Interceptors.Add<SharedSecretInterceptor>();
});

var webPort = builder.Environment.IsDevelopment() ? 5002 : 5000;

builder.WebHost.ConfigureKestrel(options =>
{
    // HTTP/1.1 for web UI (5002 in Development so Vite can use 5000)
    options.ListenLocalhost(webPort, o => o.Protocols = HttpProtocols.Http1AndHttp2);
    // HTTP/2 for gRPC
    options.ListenLocalhost(5001, o => o.Protocols = HttpProtocols.Http2);
});

var app = builder.Build();

app.UseHttpLogging();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGrpcService<AgentService>();

app.MapGet("/session/{token}", (string token, ISessionLinkService sessions) =>
{
    if (!sessions.TryGetSession(token, out _))
        return Results.NotFound("Session link expired or invalid.");
    return Results.Redirect($"/?session={Uri.EscapeDataString(token)}");
});

app.MapGet("/api/session/{token}", (string token, ISessionLinkService sessions) =>
{
    if (!sessions.TryGetSession(token, out var session) || session is null)
        return Results.NotFound();
    return Results.Json(new { oid = session.Oid, tid = session.Tid });
});

app.MapPost(
    "/api/session/{token}/connections/sql/validate",
    async (
        string token,
        ISessionLinkService sessions,
        IAgentConnectionRegistry registry,
        SqlValidateRequestBody body,
        CancellationToken cancellationToken) =>
    {
        if (!sessions.TryGetSession(token, out var session) || session is null)
            return Results.NotFound();
        if (string.IsNullOrWhiteSpace(body.ServerName))
            return Results.BadRequest(new { message = "Server name is required." });

        var (ok, message) = await registry.SendSqlValidateAsync(
            session.Oid,
            session.Tid,
            body,
            cancellationToken);
        return Results.Json(new { ok, message });
    });

app.MapFallbackToFile("index.html");

app.Run();
