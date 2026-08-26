import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadJson,coord,findChain} from './engine.js';
import {gemAssetPath} from './asset-resolver.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const state=loadJson(path.join(here,'state.json'));
const repository=process.env.GITHUB_REPOSITORY||'DanHouseman/DanHouseman';
const [owner,repo]=repository.split('/');
const uiDir=path.join(root,'assets','ui');
fs.mkdirSync(uiDir,{recursive:true});

function safe(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}

function hudSvg(){
  const satellites=state.board.flat().filter(cell=>cell?.satellite).length;
  const last=state.lastMove?`${state.lastMove.actor} → ${state.lastMove.coord}`:'AWAITING FIRST MOVE';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="122" viewBox="0 0 900 122">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#020816"/><stop offset=".52" stop-color="#080d22"/><stop offset="1" stop-color="#030716"/></linearGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5f38ff" stop-opacity="0"/><stop offset=".5" stop-color="#b76cff"/><stop offset="1" stop-color="#5f38ff" stop-opacity="0"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="1" y="1" width="898" height="120" rx="14" fill="url(#bg)" stroke="#313b68"/>
    <path d="M42 23H858" stroke="url(#line)" stroke-width="1"/>
    <text x="72" y="58" fill="#f4f5ff" font-family="Courier New,monospace" font-size="16" font-weight="700">SCORE</text>
    <text x="72" y="86" fill="#c66cff" font-family="Courier New,monospace" font-size="25" font-weight="700" filter="url(#glow)">${state.score.toLocaleString()}</text>
    <text x="270" y="58" fill="#f4f5ff" font-family="Courier New,monospace" font-size="16" font-weight="700">LEVEL</text>
    <text x="270" y="86" fill="#67dfff" font-family="Courier New,monospace" font-size="25" font-weight="700" filter="url(#glow)">${state.level}</text>
    <text x="420" y="58" fill="#f4f5ff" font-family="Courier New,monospace" font-size="16" font-weight="700">MOVES</text>
    <text x="420" y="86" fill="#7dffa6" font-family="Courier New,monospace" font-size="25" font-weight="700" filter="url(#glow)">${state.moves}</text>
    <text x="575" y="58" fill="#f4f5ff" font-family="Courier New,monospace" font-size="16" font-weight="700">SATELLITES</text>
    <text x="575" y="86" fill="#ffd45f" font-family="Courier New,monospace" font-size="25" font-weight="700" filter="url(#glow)">${satellites}</text>
    <text x="760" y="53" text-anchor="middle" fill="#8c91aa" font-family="Courier New,monospace" font-size="10">STATE v${state.version}</text>
    <text x="760" y="76" text-anchor="middle" fill="#d6d8e6" font-family="Courier New,monospace" font-size="11">${safe(last)}</text>
    <path d="M42 100H858" stroke="url(#line)" stroke-width="1"/>
  </svg>`;
}

function leaderboardSvg(){
  const players=Object.entries(state.players||{}).sort((a,b)=>b[1].score-a[1].score||b[1].largestChain-a[1].largestChain).slice(0,10);
  const rowHeight=34,height=players.length?96+players.length*rowHeight:150;
  const rows=players.length?players.map(([name,p],i)=>{
    const y=88+i*rowHeight;
    return `<text x="64" y="${y}" fill="${i===0?'#ffd45f':'#d8d9e8'}" font-family="Courier New,monospace" font-size="13">${i===0?'◆ ':''}${i+1}. @${safe(name)}</text>
      <text x="405" y="${y}" text-anchor="end" fill="#c66cff" font-family="Courier New,monospace" font-size="13">${p.score.toLocaleString()}</text>
      <text x="535" y="${y}" text-anchor="end" fill="#67dfff" font-family="Courier New,monospace" font-size="13">${p.moves}</text>
      <text x="675" y="${y}" text-anchor="end" fill="#7dffa6" font-family="Courier New,monospace" font-size="13">${p.largestChain}</text>
      <text x="820" y="${y}" text-anchor="end" fill="#ffd45f" font-family="Courier New,monospace" font-size="13">${p.satellitesRemoved}</text>`;
  }).join(''):`<text x="450" y="94" text-anchor="middle" fill="#b9bbca" font-family="Courier New,monospace" font-size="16" letter-spacing="2">AWAITING FIRST MOVE</text>
    <text x="450" y="118" text-anchor="middle" fill="#6f7692" font-family="Courier New,monospace" font-size="11">THE FIRST ACCEPTED MOVE CLAIMS THE BOARD</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}">
    <defs><linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020816"/><stop offset=".55" stop-color="#080d22"/><stop offset="1" stop-color="#030716"/></linearGradient></defs>
    <rect x="1" y="1" width="898" height="${height-2}" rx="14" fill="url(#lb)" stroke="#313b68"/>
    <text x="55" y="44" fill="#f4f5ff" font-family="Courier New,monospace" font-size="13" font-weight="700" letter-spacing="3">PLAYERS</text>
    <text x="405" y="44" text-anchor="end" fill="#8c91aa" font-family="Courier New,monospace" font-size="10">SCORE</text>
    <text x="535" y="44" text-anchor="end" fill="#8c91aa" font-family="Courier New,monospace" font-size="10">MOVES</text>
    <text x="675" y="44" text-anchor="end" fill="#8c91aa" font-family="Courier New,monospace" font-size="10">BEST CHAIN</text>
    <text x="820" y="44" text-anchor="end" fill="#8c91aa" font-family="Courier New,monospace" font-size="10">SATELLITES</text>
    <path d="M50 58H850" stroke="#313b68"/>${rows}
  </svg>`;
}

function gemMarkup(cell,row,col){
  const move=coord(row,col);
  const chain=cell?findChain(state,row,col):[];
  const playable=Boolean(cell&&(cell.kind==='prismatic'||chain.filter(part=>part.role==='gem').length>=state.rules.minimumChain));
  const picture=`<picture><source media="(max-width: 420px)" srcset="${gemAssetPath(cell,'sm')}"><source media="(max-width: 760px)" srcset="${gemAssetPath(cell,'md')}"><img src="${gemAssetPath(cell,'lg')}" alt="" loading="eager"></picture>`;
  if(!playable)return picture;
  const title=encodeURIComponent(`[PLAY] Platonic Neighbors ${move}`);
  const body=encodeURIComponent(`MOVE:${move}\nSTATE:${state.version}\n\nSubmit this issue to play.`);
  return `<a href="https://github.com/${owner}/${repo}/issues/new?title=${title}&body=${body}">${picture}</a>`;
}

fs.writeFileSync(path.join(uiDir,'hud.svg'),hudSvg());
fs.writeFileSync(path.join(uiDir,'leaderboard.svg'),leaderboardSvg());

const boardRows=[];
for(let row=0;row<state.size;row++){
  const cells=[];
  for(let col=0;col<state.size;col++)cells.push(gemMarkup(state.board[row][col],row,col));
  boardRows.push(`<div align="center">${cells.join('')}</div>`);
}

const readme=`<div align="center">
  <img src="assets/ui/hud.svg?v=${state.version}" width="900" alt="Game status">
</div>

<div align="center">
  <sub>Click any playable gem to submit the move.</sub>
</div>

<br>

${boardRows.join('\n')}

<br>

<div align="center">
  <img src="assets/ui/leaderboard.svg?v=${state.version}" width="900" alt="Player leaderboard">
</div>

<br>

<div align="center">
  <img src="assets/ui/game-rules.svg" width="900" alt="Game rules">
</div>

<br>

<div align="center">
  <img src="assets/ui/how-it-works.svg" width="900" alt="How this profile game works">
</div>
`;

fs.writeFileSync(path.join(root,'README.md'),readme);
console.log(`Rendered reference-asset ${state.size}x${state.size} board v${state.version} for ${repository}. No gem SVGs regenerated.`);
