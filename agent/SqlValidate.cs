using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace Agent;

internal static class SqlValidate
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    internal sealed class RequestDto
    {
        public string? CorrelationId { get; set; }
        public string? ServerName { get; set; }
        public string? Authentication { get; set; }
        public string? UserName { get; set; }
        public string? Password { get; set; }
        public string? DatabaseName { get; set; }
        public string? Encrypt { get; set; }
        public bool TrustServerCertificate { get; set; }
    }

    internal static string BuildResponseJson(string correlationId, bool ok, string message)
    {
        return JsonSerializer.Serialize(
            new { correlationId, ok, message },
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    internal static async Task<(string correlationId, bool ok, string message)> TryValidateAsync(
        string payload,
        CancellationToken cancellationToken)
    {
        RequestDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<RequestDto>(payload, JsonOptions);
        }
        catch (JsonException ex)
        {
            return ("", false, $"Invalid validate request: {ex.Message}");
        }

        if (dto is null || string.IsNullOrWhiteSpace(dto.CorrelationId))
            return ("", false, "Missing correlation id.");
        var correlationId = dto.CorrelationId.Trim();
        if (string.IsNullOrWhiteSpace(dto.ServerName))
            return (correlationId, false, "Server name is required.");

        var auth = dto.Authentication?.Trim().ToLowerInvariant() ?? "";
        if (auth is not ("entra-integrated" or "sql"))
            return (correlationId, false, "Unsupported authentication mode.");

        try
        {
            var csb = new SqlConnectionStringBuilder
            {
                DataSource = dto.ServerName.Trim(),
                ConnectTimeout = 15,
                TrustServerCertificate = dto.TrustServerCertificate,
            };

            if (!string.IsNullOrWhiteSpace(dto.DatabaseName))
                csb.InitialCatalog = dto.DatabaseName.Trim();

            csb.Encrypt = (dto.Encrypt?.Trim().ToLowerInvariant()) switch
            {
                "optional" => SqlConnectionEncryptOption.Optional,
                "strict" => SqlConnectionEncryptOption.Strict,
                _ => SqlConnectionEncryptOption.Mandatory,
            };

            if (auth == "entra-integrated")
                csb.Authentication = SqlAuthenticationMethod.ActiveDirectoryIntegrated;
            else
            {
                csb.UserID = dto.UserName?.Trim() ?? "";
                csb.Password = dto.Password ?? "";
            }

            await using var conn = new SqlConnection(csb.ConnectionString);
            await conn.OpenAsync(cancellationToken);
            return (correlationId, true, "Connection succeeded.");
        }
        catch (SqlException ex)
        {
            return (correlationId, false, $"SQL error: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            return (correlationId, false, ex.Message);
        }
        catch (Exception ex)
        {
            return (correlationId, false, $"Connection failed: {ex.Message}");
        }
    }
}
