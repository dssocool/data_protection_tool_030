namespace ControlCenter.Services;

public sealed record SqlValidateResult(bool Ok, string Message);

public sealed class SqlValidateRequestBody
{
    public string ServerName { get; set; } = "";
    public string Authentication { get; set; } = "";
    public string? UserName { get; set; }
    public string? Password { get; set; }
    public string? DatabaseName { get; set; }
    public string Encrypt { get; set; } = "mandatory";
    public bool TrustServerCertificate { get; set; }
}
