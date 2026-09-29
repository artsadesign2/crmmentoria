const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '../audio');
const SCRIPTS_DIR = path.join(__dirname, '../scripts');

const audios = ['01.wav', '02.wav', '03.wav', '04.wav', '05.wav'];
const scenesData = [];
let currentOffset = 0;

console.log('--- Analyzing Audio Files ---');

audios.forEach((file, index) => {
  const filePath = path.join(AUDIO_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File ${filePath} not found`);
  }

  // Get duration in seconds using ffprobe
  const probeOutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' }).trim();
  const dur = parseFloat(probeOutput);
  
  const sceneInfo = {
    cena: index + 1,
    arquivo: file,
    start: Math.round(currentOffset * 100) / 100,
    end: Math.round((currentOffset + dur) * 100) / 100,
    dur: Math.round(dur * 100) / 100
  };
  
  scenesData.push(sceneInfo);
  console.log(`Cena ${sceneInfo.cena} (${file}): ${sceneInfo.dur}s (de ${sceneInfo.start}s a ${sceneInfo.end}s)`);
  
  currentOffset += dur;
});

const totalDuration = Math.round(currentOffset * 100) / 100;
console.log(`\nTotal Duration: ${totalDuration}s`);

// 2. Concatenate audio files into voz_alinhada.wav
const concatListPath = path.join(__dirname, 'concat_list.txt');
const concatContent = audios.map(a => `file '${path.join(AUDIO_DIR, a).replace(/\\/g, '/')}'`).join('\n');
fs.writeFileSync(concatListPath, concatContent, 'utf8');

const outputAudioPath = path.join(AUDIO_DIR, 'voz_alinhada.wav');
const ffmpegConcatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a pcm_s16le -ar 24000 "${outputAudioPath}"`;
console.log('Running FFmpeg concat...');
execSync(ffmpegConcatCmd, { stdio: 'inherit' });
fs.unlinkSync(concatListPath);

console.log(`✔ Concat completed: ${outputAudioPath}`);

// 3. Save narracao.json
const narracaoJsonPath = path.join(SCRIPTS_DIR, 'narracao.json');
fs.writeFileSync(narracaoJsonPath, JSON.stringify({
  totalDuration,
  scenes: scenesData
}, null, 2), 'utf8');
console.log(`✔ Saved ${narracaoJsonPath}`);

// 4. Generate SRT subtitles
function formatSrtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

const srtTexts = [
  "No ScaleMentors, o seu crescimento é acelerado por uma metodologia validada de ponta a ponta. Dentro do Scale Academy, você acessa trilhas executivas completas sobre vendas high-ticket, estruturação de ofertas e liderança comercial.",
  "Cada módulo traz aulas direto ao ponto com materiais complementares, playbooks acionáveis e ferramentas prontas para aplicar no seu negócio no mesmo dia.",
  "Ao concluir a sua formação, você emite o seu Certificado Oficial de Especialista com autenticidade digital e validação por QR Code, consolidando o seu posicionamento no mercado.",
  "Além disso, você tem acesso ao Clube de Vantagens exclusivo com parcerias estratégicas, créditos nas principais ferramentas do mundo e conexões de alto valor com outros empresários.",
  "Eleve o nível da sua operação e faça parte de um ecossistema construído para grandes resultados. Acesse o ScaleMentors e solicite sua demonstração executiva."
];

let srtContent = '';
scenesData.forEach((sc, idx) => {
  srtContent += `${idx + 1}\n`;
  srtContent += `${formatSrtTime(sc.start)} --> ${formatSrtTime(sc.end)}\n`;
  srtContent += `${srtTexts[idx]}\n\n`;
});

const srtPath = path.join(SCRIPTS_DIR, 'ScaleMentors-Academy-WhatsApp.srt');
fs.writeFileSync(srtPath, srtContent.trim(), 'utf8');
console.log(`✔ Saved ${srtPath}`);
