import fs from 'node:fs';
import {loadJson,saveJson,newState,applyMove} from './engine.js';

const config=loadJson(new URL('./config.json',import.meta.url));
const statePath=new URL('./state.json',import.meta.url);
const replayPath=new URL('./replay.json',import.meta.url);

const issuesFile=process.env.ISSUES_FILE||process.argv[2];
if(!issuesFile){
  console.error('ISSUES_FILE is required.');
  process.exit(2);
}

const raw=JSON.parse(fs.readFileSync(issuesFile,'utf8'));
const flattened=(Array.isArray(raw)?raw:[raw]).flat(Infinity).filter(Boolean);

const playIssues=flattened
  .filter(issue=>!issue.pull_request)
  .filter(issue=>String(issue.title||'').startsWith('[PLAY] Platonic Neighbors'))
  .sort((a,b)=>(a.number||0)-(b.number||0));

const parseMove=issue=>{
  const body=String(issue.body||'');
  const coord=/\bMOVE\s*:\s*([A-Z]\d+)\b/i.exec(body)?.[1]?.toUpperCase()||null;
  const versionRaw=/\bSTATE\s*:\s*(\d+)\b/i.exec(body)?.[1];
  const version=versionRaw==null?null:Number(versionRaw);
  return {coord,version};
};

const state=newState(config);
const replay=[];
let accepted=0;
let rejected=0;

for(const issue of playIssues){
  const move=parseMove(issue);
  const actor=issue.user?.login||issue.author?.login||'unknown';
  let result;

  if(!move.coord||!Number.isInteger(move.version)){
    result={accepted:false,reason:'Malformed move request: expected MOVE:A1 and STATE:1.'};
  }else{
    result=applyMove(
      state,
      {coord:move.coord,version:move.version},
      config,
      actor,
      {issueNumber:issue.number||null,createdAt:issue.created_at||issue.createdAt||null}
    );
  }

  if(result.accepted) accepted++;
  else rejected++;

  replay.push({
    issueNumber:issue.number||null,
    actor,
    createdAt:issue.created_at||issue.createdAt||null,
    requestedCoordinate:move.coord,
    requestedStateVersion:move.version,
    accepted:Boolean(result.accepted),
    reason:result.reason,
    resultingStateVersion:state.version,
    resultingScore:state.score,
    resultingLevel:state.level,
    resolution:result.resolution||null,
    levelRestarts:state.levelRestarts||0
  });
}

state.replay={
  playIssuesSeen:playIssues.length,
  accepted,
  rejected,
  lastIssueNumber:playIssues.at(-1)?.number||null
};

saveJson(statePath,state);
saveJson(replayPath,{generatedAt:null,events:replay});

const triggerNumber=Number(process.env.TRIGGER_ISSUE_NUMBER||0);
const resultPath=process.env.RESULT_PATH;
if(resultPath){
  const trigger=replay.find(item=>item.issueNumber===triggerNumber);
  const result=trigger||{
    issueNumber:triggerNumber||null,
    accepted:false,
    reason:triggerNumber?'Trigger issue was not present in the fetched play-issue log.':'Rebuild completed.',
    resultingStateVersion:state.version,
    resultingScore:state.score,
    resultingLevel:state.level
  };
  fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');
}

console.log(`Replayed ${playIssues.length} play issues: ${accepted} accepted, ${rejected} rejected.`);
console.log(`Projected state: v${state.version}, level ${state.level}, score ${state.score}, moves ${state.moves}.`);
