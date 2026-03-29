using Grpc.Core;
using Grpc.Core.Interceptors;

namespace ControlCenter.Auth;

public class SharedSecretInterceptor : Interceptor
{
    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
    {
        ValidateSecret(context);
        return await continuation(request, context);
    }

    public override async Task DuplexStreamingServerHandler<TRequest, TResponse>(
        IAsyncStreamReader<TRequest> requestStream,
        IServerStreamWriter<TResponse> responseStream,
        ServerCallContext context,
        DuplexStreamingServerMethod<TRequest, TResponse> continuation)
    {
        ValidateSecret(context);
        await continuation(requestStream, responseStream, context);
    }

    private static void ValidateSecret(ServerCallContext context)
    {
        var secret = context.RequestHeaders.GetValue(SharedSecrets.MetadataKey);
        if (secret != SharedSecrets.Secret)
        {
            throw new RpcException(new Status(StatusCode.Unauthenticated, "Invalid shared secret."));
        }
    }
}
