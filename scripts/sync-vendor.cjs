const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'bundle','vendor');fs.mkdirSync(target,{recursive:true});
for(const [from,to] of [['pptxgenjs/dist/pptxgen.bundle.js','pptxgen.bundle.js'],['pptxgenjs/LICENSE','PptxGenJS-LICENSE.txt'],['jszip/LICENSE.markdown','JSZip-LICENSE.txt']])fs.copyFileSync(path.join(root,'node_modules',from),path.join(target,to));
console.log('PPTX 浏览器依赖已同步到 bundle/vendor。');
