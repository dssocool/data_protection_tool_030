using ControlCenter.Auth;
using ControlCenter.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

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

app.MapFallbackToFile("index.html");

app.Run();
