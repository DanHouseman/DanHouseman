import { COLORS } from './engine.js';

const TAU = Math.PI * 2;

const normalize = v => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const add = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const scale = (v,s) => [v[0]*s,v[1]*s,v[2]*s];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const centroid = points => scale(points.reduce((acc,p)=>add(acc,p),[0,0,0]),1/points.length);

function rotate(v, ax, ay, az) {
  let [x,y,z] = v;
  const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
  [y,z]=[y*cx-z*sx,y*sx+z*cx];
  [x,z]=[x*cy+z*sy,-x*sy+z*cy];
  return [x*cz-y*sz,x*sz+y*cz,z];
}

function normGeom(g) {
  const m=Math.max(...g.vertices.map(v=>Math.hypot(...v)));
  return {vertices:g.vertices.map(v=>scale(v,1/m)),faces:g.faces};
}

const tetra = () => normGeom({vertices:[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],faces:[[0,1,2],[0,3,1],[0,2,3],[1,3,2]]});
const cube = () => normGeom({vertices:[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],faces:[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[4,0,3,7]]});
const octa = () => normGeom({vertices:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],faces:[[0,2,4],[2,1,4],[1,3,4],[3,0,4],[2,0,5],[1,2,5],[3,1,5],[0,3,5]]});
function icosa(){const p=(1+Math.sqrt(5))/2;return normGeom({vertices:[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]],faces:[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]});}
function dodeca(){const ico=icosa(),verts=ico.faces.map(face=>normalize(centroid(face.map(i=>ico.vertices[i])))),adj=ico.vertices.map(()=>[]);ico.faces.forEach((face,fi)=>face.forEach(vi=>adj[vi].push(fi)));const faces=adj.map((ids,vi)=>{const n=normalize(ico.vertices[vi]),arb=Math.abs(n[0])<.8?[1,0,0]:[0,1,0],x=normalize(cross(arb,n)),y=normalize(cross(n,x));return [...ids].sort((a,b)=>{const va=sub(verts[a],scale(n,dot(verts[a],n))),vb=sub(verts[b],scale(n,dot(verts[b],n)));return Math.atan2(dot(va,y),dot(va,x))-Math.atan2(dot(vb,y),dot(vb,x));});});return normGeom({vertices:verts,faces});}

const GEOMETRIES=[tetra(),cube(),octa(),dodeca(),icosa()];
const hexRgb=hex=>{const n=parseInt(hex.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const rgbHex=rgb=>`#${rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}`;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function shade(hex,b,face){const base=hexRgb(hex),white=[255,255,255],dark=[5,10,24],lift=mix(base,white,Math.max(0,b)*.38+((face*37)%11)/100);return rgbHex(mix(lift,dark,Math.max(0,-b)*.5));}
function project(v,size){const p=3.7/(3.7-v[2]),r=size*.34;return[size*.5+v[0]*r*p,size*.5-v[1]*r*p];}
function facesFor(g,ax,ay,az,size){const rv=g.vertices.map(v=>rotate(v,ax,ay,az));return g.faces.map((f,i)=>{const p=f.map(j=>rv[j]),n=normalize(cross(sub(p[1],p[0]),sub(p[2],p[0]))),c=centroid(p);return{faceIndex:i,points:p.map(v=>project(v,size)),depth:c[2],normal:n};}).filter(f=>f.normal[2]>-.18).sort((a,b)=>a.depth-b.depth);}
function poly(face,color,shell,prism,frame){const light=normalize([-.45,.72,1]),b=dot(face.normal,light),fill=shell?'none':prism?`url(#p-${frame}-${face.faceIndex})`:shade(color,b,face.faceIndex),pts=face.points.map(([x,y])=>`${x.toFixed(2)},${y.toFixed(2)}`).join(' '),defs=prism&&!shell?`<linearGradient id="p-${frame}-${face.faceIndex}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5770"/><stop offset=".2" stop-color="#ffd84a"/><stop offset=".4" stop-color="#50e690"/><stop offset=".6" stop-color="#50baff"/><stop offset=".8" stop-color="#be68ff"/><stop offset="1" stop-color="#ff5770"/></linearGradient>`:'';return{defs,polygon:`<polygon points="${pts}" fill="${fill}" fill-opacity="${shell?1:.88}" stroke="${shell?color:'#fff'}" stroke-opacity="${shell?.92:.42}" stroke-width="${shell?1.55:.62}"/>`};}
function frameMarkup(g,color,shell,prism,i,count,size){const t=i/count,fs=facesFor(g,.45+Math.sin(t*TAU)*.18,t*TAU,.18+t*TAU*.22,size),r=fs.map(f=>poly(f,color,shell,prism,i)),values=Array.from({length:count},(_,n)=>n===i?'1':'0').concat(i===0?'1':'0').join(';'),keyTimes=Array.from({length:count+1},(_,n)=>(n/count).toFixed(5)).join(';');return{defs:r.map(x=>x.defs).join(''),group:`<g opacity="${i===0?1:0}">${r.map(x=>x.polygon).join('')}<animate attributeName="opacity" dur="4s" repeatCount="indefinite" calcMode="discrete" values="${values}" keyTimes="${keyTimes}"/></g>`};}
function satellite(cell,color,size){if(!cell.satellite)return'';const pr=cell.satellitePrismatic,satColor=pr?'#fff':color;return `<g transform="translate(${size*.5} ${size*.5})"><ellipse cx="0" cy="0" rx="${size*.34}" ry="${size*.18}" fill="none" stroke="${satColor}" stroke-opacity=".18" stroke-width=".7"/><g filter="url(#g)"><polygon points="0,-5 5,0 0,5 -5,0" fill="${satColor}" stroke="#fff" stroke-width=".6">${pr?'<animate attributeName="fill" dur="1.8s" repeatCount="indefinite" values="#ff5d70;#ffd84a;#50e690;#50baff;#be68ff;#ff5d70"/>':''}</polygon><animateMotion dur="${pr?2.4:3.2}s" repeatCount="indefinite" path="M ${-size*.34} 0 A ${size*.34} ${size*.18} 0 1 1 ${size*.34} 0 A ${size*.34} ${size*.18} 0 1 1 ${-size*.34} 0"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s" repeatCount="indefinite" additive="sum"/></g></g>`;}

export function animatedGemSvg(cell,playable=false,{size=72,frameCount=18}={}){
  if(!cell)return`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"></svg>`;
  const g=GEOMETRIES[cell.shape]||GEOMETRIES[1],color=COLORS[cell.color]?.hex||'#fff',shell=cell.kind==='shell',prism=cell.kind==='prismatic',frames=Array.from({length:frameCount},(_,i)=>frameMarkup(g,color,shell,prism,i,frameCount,size));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${frames.map(f=>f.defs).join('')}</defs><g filter="url(#g)">${frames.map(f=>f.group).join('')}</g>${satellite(cell,color,size)}</svg>`;
}
