using System.Collections.Concurrent;
using DataProtection.Grpc;
using Grpc.Core;

namespace ControlCenter.Services;

public sealed class AgentGrpcConnection
{
    private readonly IServerStreamWriter<ServerMessage> _responseStream;
    private readonly ConcurrentDictionary<string, TaskCompletionSource<SqlValidateResult>> _pending = new();
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public AgentGrpcConnection(IServerStreamWriter<ServerMessage> responseStream)
    {
        _responseStream = responseStream;
    }

    public Guid Id { get; } = Guid.NewGuid();

    public Task<SqlValidateResult> AddPendingValidate(string correlationId)
    {
        var tcs = new TaskCompletionSource<SqlValidateResult>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[correlationId] = tcs;
        return tcs.Task;
    }

    public void CompletePendingValidate(string correlationId, bool ok, string message)
    {
        if (_pending.TryRemove(correlationId, out var tcs))
            tcs.TrySetResult(new SqlValidateResult(ok, message));
    }

    public void RemovePendingValidate(string correlationId)
    {
        if (_pending.TryRemove(correlationId, out var tcs))
            tcs.TrySetCanceled();
    }

    public void FailAllPending(string message)
    {
        foreach (var key in _pending.Keys.ToArray())
        {
            if (_pending.TryRemove(key, out var tcs))
                tcs.TrySetResult(new SqlValidateResult(false, message));
        }
    }

    public async Task WriteAsync(ServerMessage message, CancellationToken cancellationToken)
    {
        await _writeLock.WaitAsync(cancellationToken);
        try
        {
            await _responseStream.WriteAsync(message, cancellationToken);
        }
        finally
        {
            _writeLock.Release();
        }
    }
}
