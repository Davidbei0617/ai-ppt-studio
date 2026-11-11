import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createPptxBytes} from '../bundle/export.js';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),Pptx=require('pptxgenjs'),Zip=require('jszip');
const layouts=['cover','content','compare','process','summary'];
const deck={title:'版式验收',theme:'ink',audience:'团队',slides:layouts.map((layout,i)=>({layout,title:['团队 AI 使用指南','从真实需求开始','两种工作方式的比较','小范围试行的步骤','本周的行动清单'][i],bullets:['明确目标：选择一个具体且有价值的任务','整理资料：收集经过核实的背景信息','小范围验证：记录实际结果与反馈','持续改进：根据效果调整下一步行动'],notes:'检查文字可编辑与演讲备注。'}))};
await mkdir('work/v11-layouts',{recursive:true});
const bytes=await createPptxBytes(Pptx,deck,Zip);await writeFile('work/v11-layouts/layouts.pptx',Buffer.from(bytes));const zip=await Zip.loadAsync(bytes);
for(let i=1;i<=5;i++){const xml=await zip.file(`ppt/slides/slide${i}.xml`).async('string');for(const text of deck.slides[i-1].bullets)assert.ok(xml.includes(text));assert.ok(zip.file(`ppt/notesSlides/notesSlide${i}.xml`));}
console.log('五种版式导出保留全部要点和备注。');
