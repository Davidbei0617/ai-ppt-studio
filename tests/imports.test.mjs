import assert from 'node:assert/strict';
import {parseDraft,readDraftFile,MAX_IMPORT_BYTES} from '../bundle/imports.js';
const old={schema:1,title:'备份恢复',theme:'paper',audience:'同学',slides:[{title:'<script>示例</script>',bullets:['保留文字'],notes:'保留备注'}],extra:'不受支持的字段'};
const imported=parseDraft('\ufeff'+JSON.stringify(old));assert.equal(imported.title,'备份恢复');assert.equal(imported.slides[0].notes,'保留备注');assert.equal(imported.extra,undefined);
assert.throws(()=>parseDraft('{invalid'),/有效的 JSON/);assert.throws(()=>parseDraft(JSON.stringify({...old,slides:[]})),/格式不正确/);assert.throws(()=>parseDraft(JSON.stringify({...old,slides:[{...old.slides[0],bullets:['长'.repeat(61)]}]})),/格式不正确/);
await assert.rejects(readDraftFile({name:'bad.txt',size:10}),/\.json/);await assert.rejects(readDraftFile({name:'large.json',size:MAX_IMPORT_BYTES+1}),/1 MB/);
assert.equal((await readDraftFile({name:'backup.JSON',size:100,text:async()=>JSON.stringify(old)})).slides.length,1);
console.log('JSON 导入的旧版兼容、字段筛选、格式/页数/文字长度与文件大小保护通过。');
