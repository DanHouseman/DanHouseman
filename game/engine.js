import fs from 'node:fs';

export const COLORS=[
  {name:'Red',hex:'#ff4b57'},{name:'Green',hex:'#46df7b'},{name:'Blue',hex:'#50a7ff'},
  {name:'Yellow',hex:'#ffd84a'},{name:'Purple',hex:'#be68ff'}
];
export const SHAPES=['tetrahedron','cube','octahedron','dodecahedron','icosahedron'];
export const RUPERT=[
  [true,true,true,true,true],
  [false,true,true,true,true],
  [false,true,true,true,true],
  [false,false,false,true,false],
  [false,false,false,true,true]
];
const DIR=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

export const loadJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const saveJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
export const key=(r,c,n)=>r*n+c;
export const coord=(r,c)=>`${String.fromCharCode(65+c)}${r+1}`;
export function parseCoord(v,n){const m=/^([A-Z])(\d+)$/i.exec(String(v||'').trim());if(!m)return null;const c=m[1].toUpperCase().charCodeAt(0)-65,r=+m[2]-1;return r>=0&&r<n&&c>=0&&c<n?{row:r,col:c}:null;}
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const same=(a,b)=>!!(a&&b&&a.kind==='gem'&&b.kind==='gem'&&a.color===b.color&&a.shape===b.shape);
const cell=(color,shape,o={})=>({kind:'gem',color,shape,satellite:false,satellitePrismatic:false,...o});
const neighbors=(s,r,c)=>DIR.map(([dr,dc])=>({row:r+dr,col:c+dc})).filter(p=>p.row>=0&&p.row<s.size&&p.col>=0&&p.col<s.size);

function component(s,r,c,target){
  const stack=[{row:r,col:c}],seen=new Set(),out=[];
  while(stack.length){
    const p=stack.pop(),k=key(p.row,p.col,s.size);
    if(seen.has(k))continue;seen.add(k);
    const current=s.board[p.row][p.col];
    if(!same(current,target))continue;
    out.push({...p,role:'gem'});
    for(const n of neighbors(s,p.row,p.col))stack.push(n);
  }
  return out;
}
function shells(s,parts){
  const m=new Map();
  for(const p of parts)for(const n of neighbors(s,p.row,p.col)){const c=s.board[n.row][n.col];if(c?.kind==='shell')m.set(key(n.row,n.col,s.size),{...n,cell:c});}
  return[...m.values()];
}
export function findChain(s,r,c){
  const clicked=s.board[r][c];if(!clicked)return[];
  if(clicked.kind==='prismatic')return[{row:r,col:c,role:'prismatic'}];
  if(clicked.kind==='shell'){
    let best=[];
    for(const n of neighbors(s,r,c)){const t=s.board[n.row][n.col];if(t?.kind!=='gem')continue;const cmp=component(s,n.row,n.col,t);if(cmp.length>best.length)best=cmp;}
    return best.length>=s.rules.minimumChain?[...best,{row:r,col:c,role:'terminalShell'}]:[];
  }
  const cmp=component(s,r,c,clicked);
  if(cmp.length<s.rules.minimumChain)return[];
  for(const sh of shells(s,cmp)){
    if(sh.cell.satellite||!RUPERT[clicked.shape]?.[sh.cell.shape])continue;
    const merged=new Map(cmp.map(p=>[key(p.row,p.col,s.size),p]));let added=false;
    for(const n of neighbors(s,sh.row,sh.col)){const t=s.board[n.row][n.col];if(!same(t,clicked))continue;for(const p of component(s,n.row,n.col,clicked)){const k=key(p.row,p.col,s.size);if(!merged.has(k)){merged.set(k,p);added=true;}}}
    if(added)return[...merged.values(),{row:sh.row,col:sh.col,role:'traversedShell'}];
  }
  const adj=shells(s,cmp);return adj.length?[...cmp,{row:adj[0].row,col:adj[0].col,role:'terminalShell'}]:cmp;
}
export function hasMove(s){
  for(let r=0;r<s.size;r++)for(let c=0;c<s.size;c++){const x=s.board[r][c];if(!x)continue;if(x.kind==='prismatic')return true;if(findChain(s,r,c).filter(p=>p.role==='gem').length>=s.rules.minimumChain)return true;}
  return false;
}
function duplicate(s){const seen=new Set();for(const x of s.board.flat()){if(x?.kind!=='gem')continue;const id=`${x.color}:${x.shape}`;if(seen.has(id))return true;seen.add(id);}return false;}
function gravity(s){for(let c=0;c<s.size;c++){const a=[];for(let r=s.size-1;r>=0;r--)if(s.board[r][c])a.push(s.board[r][c]);for(let r=s.size-1,i=0;r>=0;r--,i++)s.board[r][c]=a[i]||null;}}
function collapse(s){const cols=[];for(let c=0;c<s.size;c++)if(s.board.some(row=>row[c]))cols.push(c);const b=Array.from({length:s.size},()=>Array(s.size).fill(null)),start=Math.floor((s.size-cols.length)/2);cols.forEach((oc,i)=>{for(let r=0;r<s.size;r++)b[r][start+i]=s.board[r][oc];});s.board=b;}
function rescue(s){
  if(s.shuffleUsed||hasMove(s)||!duplicate(s))return false;
  const random=rng(s.seed^s.version),cells=shuffle(s.board.flat().filter(Boolean),random);
  let pair=null;
  outer:for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)if(same(cells[i],cells[j])){pair=[i,j];break outer;}
  if(!pair)return false;
  [cells[0],cells[pair[0]]]=[cells[pair[0]],cells[0]];
  const j=pair[1]===0?pair[0]:pair[1];
  [cells[1],cells[j]]=[cells[j],cells[1]];
  const w=Math.ceil(Math.sqrt(cells.length)),h=Math.ceil(cells.length/w),sr=Math.floor((s.size-h)/2),sc=Math.floor((s.size-w)/2),b=Array.from({length:s.size},()=>Array(s.size).fill(null));
  let i=0;
  for(let r=sr+h-1;r>=sr&&i<cells.length;r--){
    const n=Math.min(w,cells.length-i),inset=n<w?Math.floor((w-n)/2):0;
    for(let c=0;c<n;c++)b[r][sc+inset+c]=cells[i++];
  }
  s.board=b;
  s.shuffleUsed=true;
  return true;
}
function generate(s,config){const random=rng((s.seed+s.level*2654435761)>>>0),ids=SHAPES.map((_,i)=>({color:i,shape:i}));s.board=Array.from({length:s.size},()=>Array(s.size).fill(null));for(let r=0;r<s.size;r++)for(let c=0;c<s.size;c++){const id=ids[Math.floor(random()*ids.length)];s.board[r][c]=cell(id.color,id.shape);}const id=ids[Math.floor(random()*ids.length)];s.board[s.size-1][0]=cell(id.color,id.shape);s.board[s.size-1][1]=cell(id.color,id.shape);const pos=[];for(let r=0;r<s.size;r++)for(let c=0;c<s.size;c++)pos.push({r,c});shuffle(pos,random);for(const p of pos.slice(0,config.satelliteCount))s.board[p.r][p.c].satellite=true;s.shuffleUsed=false;}

function remainingSatellites(s){
  return s.board.flat().reduce((count,x)=>count+(x?.satellite?1:0),0);
}

function resolveBoardState(s,config,player){
  if(remainingSatellites(s)===0){
    player.levelsAdvanced++;
    s.level++;
    generate(s,config);
    return {kind:'advanced',reason:`All satellites cleared. Advanced to level ${s.level}.`};
  }

  if(hasMove(s))return {kind:'continue',reason:null};

  if(!s.shuffleUsed&&duplicate(s)){
    const shuffled=rescue(s);
    if(shuffled&&hasMove(s))return {kind:'shuffled',reason:'No moves remained. Used the level rescue shuffle.'};
  }

  s.levelRestarts=(s.levelRestarts||0)+1;
  player.levelRestarts=(player.levelRestarts||0)+1;
  generate(s,config);
  return {kind:'restarted',reason:`No legal moves remained. Restarted level ${s.level}.`};
}
export function newState(config){const s={version:1,seed:config.seed,level:1,score:0,moves:0,levelRestarts:0,players:{},size:config.boardSize,shuffleUsed:false,rules:{minimumChain:config.minimumChain,prismThreshold:config.prismThreshold},lastMove:null,board:[]};generate(s,config);return s;}

export function applyMove(s,move,config,actor='player',metadata={}){
  if(move.version!==s.version)return{accepted:false,reason:`Stale board. Current state is v${s.version}.`};
  const p=parseCoord(move.coord,s.size);if(!p)return{accepted:false,reason:'Invalid coordinate.'};
  const clicked=s.board[p.row][p.col];if(!clicked)return{accepted:false,reason:'That cell is empty.'};
  let chain=findChain(s,p.row,p.col);
  if(clicked.kind==='prismatic'){const colors=new Set([clicked.color,clicked.ringColor]);chain=[];for(let r=0;r<s.size;r++)for(let c=0;c<s.size;c++)if(s.board[r][c]&&colors.has(s.board[r][c].color))chain.push({row:r,col:c,role:'gem'});}
  const ordinary=chain.filter(x=>x.role==='gem');if(ordinary.length<s.rules.minimumChain&&clicked.kind!=='prismatic')return{accepted:false,reason:'No legal chain starts there.'};
  const source=ordinary.length?s.board[ordinary[0].row][ordinary[0].col]:clicked,sh=chain.find(x=>x.role?.includes('Shell')),shell=sh?s.board[sh.row][sh.col]:null,sat=chain.reduce((n,x)=>n+(s.board[x.row][x.col]?.satellite?1:0),0),n=ordinary.length;
  const moveScore=n*n*config.scoreFactor+sat*config.satelliteBonus;
  s.score+=moveScore;s.moves++;
  if(!s.players)s.players={};
  const player=s.players[actor]||(s.players[actor]={score:0,moves:0,chains:0,gemsDestroyed:0,largestChain:0,satellitesRemoved:0,prismaticGemsCreated:0,prismaticSatellitesCreated:0,levelsAdvanced:0,levelRestarts:0});
  player.score+=moveScore;
  player.moves++;
  player.chains++;
  player.gemsDestroyed+=n;
  player.largestChain=Math.max(player.largestChain,n);
  player.satellitesRemoved+=sat;
  player.lastMoveAt=metadata.createdAt||null;
  for(const x of chain)s.board[x.row][x.col]=null;
  let residue=null,dest=p;
  if(n>=s.rules.prismThreshold){residue=cell(source.color,source.shape,{kind:'prismatic',ringColor:(source.color+3)%COLORS.length,satellite:sat>0,satellitePrismatic:sat>1});player.prismaticGemsCreated++;if(sat>1)player.prismaticSatellitesCreated++;}
  else{const base=shell?2:(n%2===0?0:1),final=(base+sat)%3,kind=final===0?'empty':final===1?'shell':'gem',identity=shell||source;if(kind!=='empty')residue=cell(identity.color,identity.shape,{kind,satellite:sat>0,satellitePrismatic:sat>1});if(sh?.role==='traversedShell')dest=sh;}
  if(residue)s.board[dest.row][dest.col]=residue;
  gravity(s);
  collapse(s);
  const resolution=resolveBoardState(s,config,player);
  s.version++;
  s.lastMove={actor,coord:move.coord,ordinaryGems:n,satellites:sat,score:s.score,issueNumber:metadata.issueNumber||null,createdAt:metadata.createdAt||null,resolution:resolution.kind};
  const baseReason=`Move accepted. Chain ${n}; +${moveScore} points; shared score ${s.score}.`;
  return{accepted:true,reason:resolution.reason?`${baseReason} ${resolution.reason}`:baseReason,resolution:resolution.kind};
}
