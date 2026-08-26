import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {animatedGemSvg} from './svg-gem.js';
import {ASSET_VARIANTS,gemAssetKey} from './asset-resolver.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const outputRoot=path.join(root,'assets','gems');

const satelliteStates=[
  {satellite:false,satellitePrismatic:false},
  {satellite:true,satellitePrismatic:false},
  {satellite:true,satellitePrismatic:true}
];

function allVisualStates(){
  const states=[null];
  for(const kind of ['gem','shell','prismatic']){
    for(let identity=0;identity<5;identity++){
      for(const sat of satelliteStates){
        states.push({kind,color:identity,shape:identity,...sat,ringColor:(identity+3)%5});
      }
    }
  }
  return states;
}

fs.mkdirSync(outputRoot,{recursive:true});
let written=0;
for(const [variant,settings] of Object.entries(ASSET_VARIANTS)){
  const dir=path.join(outputRoot,variant);
  fs.mkdirSync(dir,{recursive:true});
  for(const cell of allVisualStates()){
    const filename=`${gemAssetKey(cell)}.svg`;
    const target=path.join(dir,filename);
    const svg=animatedGemSvg(cell,false,settings);
    if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==svg){
      fs.writeFileSync(target,svg);
      written++;
    }
  }
}
console.log(`Gem asset library ready. ${written} files written/updated.`);
