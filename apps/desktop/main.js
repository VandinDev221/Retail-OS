const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createDesktopShortcut() {
  try {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\vande';
    const possibleDesktops = [
      path.join(userProfile, 'OneDrive', 'Desktop'),
      path.join(userProfile, 'OneDrive', 'Área de Trabalho'),
      path.join(userProfile, 'Desktop'),
      path.join(userProfile, 'Área de Trabalho'),
    ];

    let targetDesktop = null;
    for (const dir of possibleDesktops) {
      if (fs.existsSync(dir)) {
        targetDesktop = dir;
        break;
      }
    }

    if (!targetDesktop) {
      targetDesktop = path.join(userProfile, 'Desktop');
      fs.mkdirSync(targetDesktop, { recursive: true });
    }

    const shortcutPath = path.join(targetDesktop, 'RetailSyn PDV.lnk');
    const exePath = process.execPath;
    const workDir = path.dirname(exePath);

    const { execSync } = require('child_process');
    const psScript = `
      $ws = New-Object -ComObject WScript.Shell
      $sc = $ws.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}')
      $sc.TargetPath = '${exePath.replace(/\\/g, '\\\\')}'
      $sc.WorkingDirectory = '${workDir.replace(/\\/g, '\\\\')}'
      $sc.Description = 'RetailSyn PDV - Frente de Caixa e Gestão em Tempo Real'
      $sc.Save()
    `;
    const tempPs = path.join(app.getPath('temp'), 'create_sc_el.ps1');
    fs.writeFileSync(tempPs, psScript, 'utf8');
    execSync(`powershell -ExecutionPolicy Bypass -File "${tempPs}"`, { stdio: 'ignore' });
    if (fs.existsSync(tempPs)) fs.unlinkSync(tempPs);
  } catch (e) {
    console.error('Erro ao criar atalho:', e.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RetailSyn PDV Desktop',
    backgroundColor: '#090A0F',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // URL do Frontend em Produção
  const targetUrl = process.env.DESKTOP_URL || 'https://retailsyncbr.vercel.app/pos';
  mainWindow.loadURL(targetUrl);

  // Redirecionar links externos para o navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handlers para IPC
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  createDesktopShortcut();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
