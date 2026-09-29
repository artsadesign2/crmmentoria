const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const audioDir = path.resolve('motion/videos/02-tour-crm-pipeline/audio');
const files = ['01.wav', '02.wav', '03.wav', '04.wav', '05.wav'];

console.log('--- Verificando áudios do Vídeo 02 ---');
const durations = [];

files.forEach((f) => {
  const p = path.join(audioDir, f);
  const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`).toString().trim();
  const dur = parseFloat(out);
  durations.push({ file: f, duration: dur });
  console.log(`${f}: ${dur.toFixed(2)}s`);
});

const totalRaw = durations.reduce((acc, d) => acc + d.duration, 0);
console.log(`Duração bruta total: ${totalRaw.toFixed(2)}s`);

// Concatenação com pequena pausa suave de 0.4s entre cada cena para ritmo natural
const pauseSec = 0.4;
let currentTime = 0;
const scenes = [];

// Gerar lista para concatenação com ffmpeg
const concatListPath = path.join(audioDir, 'concat.txt');
const filterComplex = [];
let inputs = '';

files.forEach((f, idx) => {
  inputs += ` -i "${path.join(audioDir, f)}"`;
});

// Criar voz alinhada com concat filter ou resample unificado
const outputFile = path.join(audioDir, 'voz_alinhada.wav');
const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[out]" -map "[out]" "${outputFile}"`;

console.log('Executando concatenação de áudio...');
execSync(ffmpegCmd);

const totalAligned = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputFile}"`).toString().trim());
console.log(`Voz alinhada gerada com sucesso: ${totalAligned.toFixed(2)}s em ${outputFile}`);

// Calcular os timestamps de cada cena
let t = 0;
durations.forEach((d, idx) => {
  const start = t;
  const end = t + d.duration;
  scenes.push({
    cena: idx + 1,
    arquivo: d.file,
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    dur: Number(d.duration.toFixed(2))
  });
  t = end;
});

console.log('Timestamps das cenas:', JSON.stringify(scenes, null, 2));

// Salvar narracao.json
const narracaoJsonPath = path.resolve('motion/videos/02-tour-crm-pipeline/scripts/narracao.json');
fs.writeFileSync(narracaoJsonPath, JSON.stringify({
  totalDuration: totalAligned,
  scenes: scenes
}, null, 2));
console.log('Salvo em:', narracaoJsonPath);
