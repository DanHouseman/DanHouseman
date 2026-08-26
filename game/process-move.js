import {loadJson,saveJson,applyMove} from './engine.js';

const config=loadJson(new URL('./config.json',import.meta.url));
const statePath=new URL('./state.json',import.meta.url);
const resultPath=new URL('./result.json',import.meta.url);
const state=loadJson(statePath);

const body=process.env.MOVE_BODY||process.argv.slice(2).join(' ');
const coord=/\bMOVE\s*:\s*([A-Z]\d+)\b/i.exec(body)?.[1]?.toUpperCase();
const version=Number(/\bSTATE\s*:\s*(\d+)\b/i.exec(body)?.[1]);
const actor=process.env.MOVE_ACTOR||'local-player';

const result=!coord||!Number.isInteger(version)
  ? {accepted:false,reason:'Move request must contain MOVE:A1 and STATE:123.'}
  : applyMove(state,{coord,version},config,actor,{createdAt:null,issueNumber:null});

if(result.accepted) saveJson(statePath,state);
saveJson(resultPath,result);
console.log(result.reason);
