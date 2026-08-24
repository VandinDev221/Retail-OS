const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
const targetExe = 'C:\\Users\\vande\\Downloads\\RetailSyn-PDV-Setup-1.2.0.exe';
const workDir = 'C:\\Users\\vande\\Downloads';

const psScript = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${Buffer.from(shortcutPath, 'utf8').toString('base64')}')))
$sc.TargetPath = '${targetExe.replace(/\\/g, '\\\\')}'
$sc.WorkingDirectory = '${workDir.replace(/\\/g, '\\\\')}'
$sc.Description = 'RetailSyn PDV - Frente de Caixa e Gestão'
$sc.Save()
`;

const psPath = path.join(__dirname, 'create_sc.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });
  console.log(`\n🎉 ATALHO CRIADO COM SUCESSO NA ÁREA DE TRABALHO!`);
  console.log(`📍 Local: ${shortcutPath}`);
} catch (e) {
  console.error('Erro ao criar atalho:', e.message);
} finally {
  if (fs.existsSync(psPath)) fs.unlinkSync(psPath);
}
