const fs = require('fs');
const path = require('path');

// Criar um header de arquivo .ico de 32x32 com imagem PNG embutida (formato ICO moderno do Windows)
const pngPath = 'c:\\dev\\estoque2.0\\apps\\web\\public\\icon.png';
const icoPath = 'c:\\dev\\estoque2.0\\apps\\api\\scratch\\app.ico';

if (fs.existsSync(pngPath)) {
  const pngBuffer = fs.readFileSync(pngPath);
  
  // ICO Directory Header (6 bytes): 00 00 (Reserved) | 01 00 (Type ICO) | 01 00 (1 Image)
  const header = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
  
  // Directory Entry (16 bytes)
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // Width 0 = 256px
  entry.writeUInt8(0, 1); // Height 0 = 256px
  entry.writeUInt8(0, 2); // Color palette
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  entry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)
  
  const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Arquivo ICO gerado com sucesso em: ${icoPath} (${icoBuffer.length} bytes)`);
} else {
  console.error(`❌ Imagem PNG não encontrada em: ${pngPath}`);
}
