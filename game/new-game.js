import {loadJson,saveJson,newState} from './engine.js';
const config=loadJson(new URL('./config.json',import.meta.url));
saveJson(new URL('./state.json',import.meta.url),newState(config));
