namespace ControlCenter.Options;

public class ControlCenterOptions
{
    public const string SectionName = "ControlCenter";

    /// <summary>Public origin for links shown to agents (web UI port, not gRPC).</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:5000";

    /// <summary>How long session tokens remain valid after agent connect.</summary>
    public int SessionTtlMinutes { get; set; } = 15;
}
