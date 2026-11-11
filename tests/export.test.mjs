import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);const JSZip=require('jszip');globalThis.JSZip=JSZip;
const code=await readFile(new URL('../bundle/export.js',import.meta.url),'utf8');
const {buildPresentation,createPptxBytes,exportPresentation,safeFilename}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
// Exercise the exact vendored browser library rather than only its Node entry.
const context={console,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,Blob,TextEncoder,TextDecoder};context.window=context;context.self=context;
vm.createContext(context);vm.runInContext(await readFile(new URL('../bundle/vendor/pptxgen.bundle.js',import.meta.url),'utf8'),context);
const Pptx=context.PptxGenJS;
const deck={title:'中文导出验收',audience:'大学生',source:'ai',theme:'ink',slides:Array.from({length:4},(_,i)=>({title:'可编辑的标题 '+i,bullets:['正文要点：保持清晰','特殊字符 <AI> & 编辑'],notes:'演讲备注 '+i}))};
for(const theme of ['ink','paper','forest']){
  const bytes=await createPptxBytes(Pptx,{...deck,theme},JSZip);
  const zip=await JSZip.loadAsync(bytes);assert.equal(Object.keys(zip.files).filter(k=>/^ppt\/slides\/slide\d+\.xml$/.test(k)).length,4);
  const types=await zip.file('[Content_Types].xml').async('string');
  for(const entry of types.matchAll(/<Override\b[^>]*PartName="([^"]+)"/g))assert.ok(zip.file(entry[1].replace(/^\//,'')),'Missing declared part: '+entry[1]);
  const xml=await zip.file('ppt/slides/slide1.xml').async('string');assert.match(xml,/可编辑的标题 0/);assert.match(xml,/&lt;AI&gt; &amp; 编辑/);assert.match(xml,/<a:t>/);assert.ok(!Object.keys(zip.files).some(k=>k.startsWith('ppt/media/')&&!zip.files[k].dir));
  const notes=await zip.file('ppt/notesSlides/notesSlide1.xml').async('string');assert.match(notes,/演讲备注 0/);
  const presentation=await zip.file('ppt/presentation.xml').async('string');assert.match(presentation,/cx="12192000" cy="6858000"/);
  await mkdir(new URL('../work/export-qa/',import.meta.url),{recursive:true});await writeFile(new URL('../work/export-qa/'+theme+'.pptx',import.meta.url),Buffer.from(bytes));
}
assert.equal(safeFilename('a/b:c'),'a_b_c.pptx');
const calls=[];const originalFetch=globalThis.fetch;
const anna={files:{upload_init:async args=>{calls.push('init');assert.ok(args.size>1000);return {put_url:'https://upload.example.test',headers:{'Content-Type':args.content_type}};},upload_finalize:async args=>{calls.push('finalize');assert.ok(args.size_bytes>1000);},download:async args=>{calls.push('download');assert.match(args.filename,/\.pptx$/);if(calls.filter(c=>c==='download').length===1)throw Error('simulated download failure');}}};
globalThis.fetch=async(url,args)=>{assert.equal(args.method,'PUT');assert.ok(args.body.size>1000);calls.push('PUT');return {ok:true};};
try{
  await assert.rejects(exportPresentation({Pptx,deck,anna}),/simulated/);
  await exportPresentation({Pptx,deck,anna});assert.deepEqual(calls,['init','PUT','finalize','download','download']);
}finally{globalThis.fetch=originalFetch;}
console.log('三种主题均生成有效 PPTX：页数、可编辑文字、中文转义、备注、16:9 及平台上传/下载重试检查通过。');

// Regression: local Anna debug still uses real AI/cloud drafts but must not PUT
// to a bucket whose CORS configuration excludes localhost.
let clicked=0;
const savedDocument=globalThis.document;
const savedTimer=globalThis.setTimeout;
const savedCreate=URL.createObjectURL,savedRevoke=URL.revokeObjectURL;
globalThis.document={createElement:()=>({click(){clicked++;assert.match(this.download,/\.pptx$/);}})};
URL.createObjectURL=blob=>{assert.ok(blob.size>1000);return 'blob:test';};
URL.revokeObjectURL=()=>{};
globalThis.setTimeout=callback=>{callback();};
try {
  await exportPresentation({Pptx,deck,anna:{files:{upload_init(){throw Error('Local mode must never upload');}}},localDownload:true});
  assert.equal(clicked,1);
}finally{globalThis.document=savedDocument;globalThis.setTimeout=savedTimer;URL.createObjectURL=savedCreate;URL.revokeObjectURL=savedRevoke;}
console.log('localhost 模式直接下载 PPTX，不触发 R2 上传；staging 模式仍覆盖平台上传流程。');
