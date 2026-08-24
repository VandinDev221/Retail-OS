using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace RetailSynPDV
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            CreateDesktopShortcut();
            LaunchNativeDesktopApp();
        }

        static void LaunchNativeDesktopApp()
        {
            try
            {
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath))
                {
                    edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }

                string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                if (!File.Exists(chromePath))
                {
                    chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
                }

                string binaryPath = File.Exists(edgePath) ? edgePath : File.Exists(chromePath) ? chromePath : null;

                string userDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RetailSynPDVData");
                if (!Directory.Exists(userDataDir))
                {
                    Directory.CreateDirectory(userDataDir);
                }

                string targetUrl = "https://retailsyncbr.vercel.app/pos";

                if (binaryPath != null)
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = binaryPath;
                    psi.Arguments = "--app=" + targetUrl + " --window-size=1280,800 --user-data-dir=\"" + userDataDir + "\" --disable-features=Translate";
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(targetUrl);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar o RetailSyn PDV Desktop: " + ex.Message, "RetailSyn PDV", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void CreateDesktopShortcut()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                if (string.IsNullOrEmpty(desktop) || !Directory.Exists(desktop))
                {
                    string user = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    string oneDriveDesktop = Path.Combine(user, "OneDrive", "Desktop");
                    if (Directory.Exists(oneDriveDesktop)) desktop = oneDriveDesktop;
                    else desktop = Path.Combine(user, "Desktop");
                }

                string shortcutPath = Path.Combine(desktop, "RetailSyn PDV.lnk");
                string exePath = Application.ExecutablePath;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(exePath);
                    shortcut.Description = "RetailSyn PDV - Aplicativo Frente de Caixa em Tempo Real";
                    shortcut.Save();
                }
            }
            catch { }
        }
    }
}
