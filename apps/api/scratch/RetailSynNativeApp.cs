using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

namespace RetailSynPDV
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            SetBrowserEmulation();
            CreateDesktopShortcut();

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new PDVForm());
        }

        static void SetBrowserEmulation()
        {
            try
            {
                var appName = Path.GetFileName(Application.ExecutablePath);
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION"))
                {
                    if (key != null)
                    {
                        key.SetValue(appName, 11001, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
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
                    shortcut.Description = "RetailSyn PDV - Aplicativo Nativo Frente de Caixa";
                    shortcut.IconLocation = exePath + ",0";
                    shortcut.Save();
                }
            }
            catch { }
        }
    }

    public class PDVForm : Form
    {
        private WebBrowser browser;

        public PDVForm()
        {
            this.Text = "RetailSyn PDV Desktop";
            this.FormBorderStyle = FormBorderStyle.None; // SEM NAVEGADOR
            this.WindowState = FormWindowState.Maximized; // TELA CHEIA AUTOMÁTICA
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(9, 10, 15);
            this.ShowInTaskbar = true;

            try
            {
                string icoPath = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "app.ico");
                if (File.Exists(icoPath))
                {
                    this.Icon = new Icon(icoPath);
                }
            }
            catch { }

            browser = new WebBrowser();
            browser.Dock = DockStyle.Fill;
            browser.IsWebBrowserContextMenuEnabled = false;
            browser.ScriptErrorsSuppressed = true;
            browser.Url = new Uri("https://retailsyncbr.vercel.app/pos");

            this.Controls.Add(browser);
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Escape)
            {
                this.Close();
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }
    }
}
