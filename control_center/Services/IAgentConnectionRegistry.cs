using DataProtection.Grpc;
using Grpc.Core;

namespace ControlCenter.Services;

public interface IAgentConnectionRegistry
{
    AgentGrpcConnection RegisterConnection(string oid, string tid, IServerStreamWriter<ServerMessage> responseStream);

    void TryUnregisterConnection(string oid, string tid, Guid connectionId);

    Task<(bool ok, string message)> SendSqlValidateAsync(
        string oid,
        string tid,
        SqlValidateRequestBody body,
        CancellationToken cancellationToken);

    void HandleSqlValidateResponse(string oid, string tid, string correlationId, bool ok, string message);
}
