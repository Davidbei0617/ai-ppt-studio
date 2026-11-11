import assert from 'node:assert/strict';
import {rewriteSlide} from '../bundle/ai.js';
const original={title:'原页面',layout:'process',bullets:['第一步','第二步'],notes:'原备注'};
let calls=0;
const page=await rewriteSlide({llm:{complete:async request=>{calls++;assert.equal(request.maxTokens,1000);assert.match(request.systemPrompt,/process/);return {stopReason:'endTurn',content:{text:JSON.stringify({title:'改写候选',layout:'cover',bullets:['明确目标','开展验证'],notes:'新备注'})}};}}},{slide:original,topic:'主题',audience:'学生',action:'shorten'});
assert.equal(calls,1);assert.equal(page.layout,'process');assert.equal(original.title,'原页面');assert.equal(page.title,'改写候选');
await assert.rejects(rewriteSlide({llm:{complete:async()=>({stopReason:'maxTokens'})}},{slide:original,topic:'主题',audience:'学生',action:'shorten'}),/截断/);
await assert.rejects(rewriteSlide({}, {slide:original,action:'invalid'}),/有效/);
console.log('单页改写保持原页、保留版式、单次限额调用及截断保护检查通过。');

await assert.rejects(rewriteSlide({}, {slide:original,action:'custom',instruction:''}),/修改要求/);
await assert.rejects(rewriteSlide({}, {slide:original,action:'custom',instruction:'长'.repeat(501)}),/修改要求/);
