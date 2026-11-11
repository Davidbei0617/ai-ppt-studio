import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../bundle/ai.js',import.meta.url),'utf8');
const {generateDeck,parseReply,buildRequest,friendlyError}=await import('../bundle/ai.js');
const brief={topic:'校园旧物交换',audience:'大学生',count:4,theme:'ink'};
function response(){return {content:{type:'text',text:JSON.stringify({title:'校园旧物交换',slides:Array.from({length:4},(_,i)=>({title:'第'+(i+1)+'页',bullets:['具体观点','可执行行动'],notes:'讲述提示'}))})},stopReason:'endTurn',usage:{totalTokens:240}};}
test('生成流程通过 Anna 接口且不自动重复请求',async()=>{
  let calls=0;
  const deck=await generateDeck({llm:{complete:async(request,options)=>{calls++;assert.equal(request.thinking,false);assert.equal(request.maxTokens,2400);assert.equal(options.timeoutMs,180000);assert.match(request.messages[0].content.text,/校园旧物交换/);return response();}}},brief);
  assert.equal(calls,1);assert.equal(deck.source,'ai');assert.equal(deck.slides.length,4);assert.equal(deck.usage.totalTokens,240);
});
test('截断、页数错误和超长内容不进入编辑器',()=>{
  const r=response();assert.throws(()=>parseReply({...r,stopReason:'maxTokens'},brief),/截断/);
  assert.throws(()=>parseReply(r,{...brief,count:6}),/页数/);
  const value=JSON.parse(r.content.text);value.slides[0].bullets=['长'.repeat(61)];r.content.text=JSON.stringify(value);assert.throws(()=>parseReply(r,brief),/排版/);
});
test('非 JSON 响应被拒绝；JSON 代码围栏可兼容',()=>{
  assert.throws(()=>parseReply({content:{text:'下面为您生成内容'}},brief),/无法解析/);
  const r=response();r.content.text='```json\n'+r.content.text+'\n```';assert.equal(parseReply(r,brief).slides.length,4);
});
test('失败不重试且呈现额度或超时说明',async()=>{
  let calls=0;await assert.rejects(generateDeck({llm:{complete:async()=>{calls++;throw new Error('quota_exceeded');}}},brief));assert.equal(calls,1);
  assert.match(friendlyError(new Error('quota_exceeded')),/额度不足/);assert.match(friendlyError(new Error('timeout')),/可能已消耗额度/);
  assert.throws(()=>buildRequest({...brief,count:100}),/4、6 或 8/);
});
