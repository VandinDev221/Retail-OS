const fs = require('fs');
const path = 'C:\\Users\\vande\\Downloads\\RetailSyn-PDV-Setup-1.2.0.exe';

const buf = fs.readFileSync(path);
const str = buf.toString('utf8');

// Search for http or https URLs or webBrowser navigate calls
const urls = str.match(/https?:\/\/[^\s\0"'\<\>]+/gi) || [];
console.log('URLs found in EXE:', urls);

// Search for all strings inside UTF-16LE or ASCII in .NET metadata
const utf16Strings = [];
for (let i = 0; i < buf.length - 2; i += 2) {
  let text = '';
  let j = i;
  while (j < buf.length - 1) {
    const charCode = buf.readUInt16LE(j);
    if (charCode >= 32 && charCode <= 126) {
      text += String.fromCharCode(charCode);
      j += 2;
    } else {
      break;
    }
  }
  if (text.length >= 4) {
    utf16Strings.push(text);
  }
}

const uniqueUtf16 = Array.from(new Set(utf16Strings));
console.log('\n--- UTF-16LE Strings in .NET EXE ---');
console.log(uniqueUtf16.filter(s => s.includes('http') || s.includes('app') || s.includes('syn') || s.includes('html') || s.includes('retailsyn') || s.includes('vercel') || s.includes('render') || s.includes('localhost') || s.includes('pos')).slice(0, 50));
