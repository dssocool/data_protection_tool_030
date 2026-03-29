using ControlCenter.Auth;
using ControlCenter.Options;
using ControlCenter.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMemoryCache();
builder.Services.Configure<ControlCenterOptions>(
    builder.Configuration.GetSection(ControlCenterOptions.SectionName));
builder.Services.AddSingleton<ISessionLinkService, SessionLinkService>();

builder.Services.AddGrpc(options =>
{
    options.Interceptors.Add<SharedSecretInterceptor>();
});

builder.WebHost.ConfigureKestrel(options =>
{
    // HTTP/1.1 for web UI
    options.ListenLocalhost(5000, o => o.Protocols = HttpProtocols.Http1AndHttp2);
    // HTTP/2 for gRPC
    options.ListenLocalhost(5001, o =>
    {
        o.Protocols = HttpProtocols.Http2;
        o.UseHttps();
    });
});

var app = builder.Build();

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

app.MapFallbackToFile("index.html");

app.Run();
