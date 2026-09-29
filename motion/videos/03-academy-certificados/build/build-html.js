const fs = require('fs');
const path = require('path');

let srcHtml = fs.readFileSync(path.join(__dirname, '../../01-apresentacao-whatsapp/src/peca.html'), 'utf8');

// Normalize line endings to \n for split
srcHtml = srcHtml.replace(/\r\n/g, '\n');

const pecaMarker = '/* =====================================================================\n   PEÇA';
const pecaSplit = srcHtml.indexOf(pecaMarker);
if (pecaSplit === -1) {
  throw new Error('Could not find PECA split in template');
}

let headPart = srcHtml.substring(0, pecaSplit);

// Update title and CFG in headPart
headPart = headPart.replace(
  '<title>ScaleMentors - Apresentação Comercial WhatsApp</title>',
  '<title>ScaleMentors - Tour do Academy & Certificação VIP</title>'
);

const cfgRegex = /const CFG=\{.*?\};/;
const newCfgStr = 'const CFG={"titulo": "ScaleMentors - Tour do Academy & Certificação VIP", "arquivo": "scalementors-academy-certificacao", "w": 1080, "h": 1920, "dur": 66.84, "fps": 30, "fontes": [{"familia": "Plus Jakarta Sans", "peso": 700, "italico": true}, {"familia": "Inter", "peso": 400, "italico": true}], "narracao_inicio": 0, "capas": [{"nome": "capa-academy", "w": 1080, "h": 1920}]};';

headPart = headPart.replace(cfgRegex, newCfgStr);

// 2. Read peca.js
let pecaJs = fs.readFileSync(path.join(__dirname, '../src/peca.js'), 'utf8');
pecaJs = pecaJs.replace(/\r\n/g, '\n');

// 3. Extract the bottom script from 01-apresentacao-whatsapp/src/peca.html
const bottomScriptIdx = srcHtml.lastIndexOf('<script>\n(async()=>{');
if (bottomScriptIdx === -1) {
  throw new Error('Could not find bottom script');
}
const bottomPart = srcHtml.substring(bottomScriptIdx);

// Combine
const fullHtml = headPart + pecaJs + '\n</script>\n' + bottomPart;

fs.writeFileSync(path.join(__dirname, '../src/peca.html'), fullHtml, 'utf8');
console.log('Successfully created motion/videos/03-academy-certificados/src/peca.html!');
