using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

internal static class DisplaySession
{
    private const string ForceBrowserVar = "DATA_PROTECTION_FORCE_BROWSER";
    private const string HeadlessVar = "DATA_PROTECTION_HEADLESS";

    internal static bool ShouldTryOpenBrowser()
    {
        if (EnvTruthy(ForceBrowserVar))
            return true;
        if (EnvTruthy(HeadlessVar))
            return false;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DISPLAY"))
                || !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WAYLAND_DISPLAY"));

        if (OperatingSystem.IsWindows())
            return GetMonitorCountWindows() > 0;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SSH_CONNECTION"));

        return true;
    }

    internal static void OpenBrowserOrPrint(string url)
    {
        if (ShouldTryOpenBrowser())
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
                return;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Could not open browser: {ex.Message}");
            }
        }

        Console.WriteLine(url);
    }

    private static bool EnvTruthy(string name)
    {
        var v = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrEmpty(v))
            return false;
        return v.Equals("1", StringComparison.OrdinalIgnoreCase)
            || v.Equals("true", StringComparison.OrdinalIgnoreCase)
            || v.Equals("yes", StringComparison.OrdinalIgnoreCase);
    }

    [SupportedOSPlatform("windows")]
    private static int GetMonitorCountWindows()
    {
        const int SM_CMONITORS = 80;
        return GetSystemMetrics(SM_CMONITORS);
    }

    [SupportedOSPlatform("windows")]
    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);
}
