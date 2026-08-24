const fs = require('fs');
const path = 'C:\\Users\\vande\\Downloads\\RetailSyn-PDV-Setup-1.2.0.exe';

const buf = fs.readFileSync(path);
const str = buf.toString('binary');

console.log(`Size of EXE: ${buf.length} bytes`);

const matches = str.match(/[a-zA-Z0-9\:\/\.\-\_\s]{5,}/g) || [];
console.log('\n--- Readable strings in EXE ---');
const filtered = matches
  .map(s => s.trim())
  .filter(s => s.length > 5 && !/^\s+$/.test(s));

const unique = Array.from(new Set(filtered));
console.log(unique.slice(0, 50).join('\n'));
