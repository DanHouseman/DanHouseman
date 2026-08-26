import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const uiDir=path.join(root,'assets','ui');
fs.mkdirSync(uiDir,{recursive:true});

const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

function panelSvg(title,lines){
  const lineHeight=24,height=Math.max(150,74+lines.length*lineHeight+34);
  const rendered=lines.map((line,index)=>`<text x="62" y="${74+index*lineHeight}" fill="${line.accent?'#d9c7ff':'#c9ccda'}" font-family="Courier New,monospace" font-size="${line.size||13}"${line.bold?' font-weight="700"':''}>${safe(line.text)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}">
    <defs><linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020816"/><stop offset=".52" stop-color="#090d24"/><stop offset="1" stop-color="#030716"/></linearGradient></defs>
    <rect x="1" y="1" width="898" height="${height-2}" rx="14" fill="url(#pbg)" stroke="#313b68"/>
    <text x="55" y="46" fill="#f5f6ff" font-family="Courier New,monospace" font-size="13" font-weight="700" letter-spacing="3">${safe(title)}</text>
    <path d="M50 58H850" stroke="#313b68"/>${rendered}
  </svg>`;
}

fs.writeFileSync(path.join(uiDir,'game-rules.svg'),panelSvg('GAME RULES',[
  {text:'◆ Chains use 8-direction adjacency and must match both color and Platonic shape.',accent:true},
  {text:'◆ Parity counts ordinary gems only. Even begins empty; odd begins with a matching shell.'},
  {text:'◆ Compatible solids may connect through an unoccupied shell using Rupert permeability.'},
  {text:'◆ Satellites advance residue: EMPTY → SHELL → SOLID → EMPTY.'},
  {text:'◆ Multiple participating satellites can create a prismatic satellite.'},
  {text:'◆ Shells carrying satellites cannot be used for Rupert traversal.'},
  {text:'◆ Chains of 8+ ordinary gems create a prismatic gem at the clicked position.'},
  {text:'◆ One rescue shuffle is available if no move remains but a compatible pair exists.'},
  {text:'◆ If no legal move remains after the rescue opportunity, the current level restarts.'},
  {text:'◆ Clearing every satellite advances the level while preserving the shared score.'}
]));

fs.writeFileSync(path.join(uiDir,'how-it-works.svg'),panelSvg('HOW THIS PROFILE GAME WORKS',[
  {text:'GitHub Issues are the authoritative move log.',accent:true,bold:true},
  {text:'Each Action rebuilds the deterministic board by replaying [PLAY] issues in order.'},
  {text:'game/state.json and game/replay.json are generated projections, not sources of truth.'},
  {text:'Board cells reference immutable reusable gem SVG assets instead of regenerating them.'},
  {text:'Only README.md, HUD, leaderboard, state and replay normally change after a move.'},
  {text:'GitHub Actions serialize moves, reject stale requests, commit the projection, and close the issue.'}
]));

console.log('Static UI assets generated.');
