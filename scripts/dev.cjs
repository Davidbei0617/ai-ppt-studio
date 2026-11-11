const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const env={...process.env,UV_CACHE_DIR:path.join(root,'work','uv-cache'),UV_TOOL_DIR:path.join(root,'work','uv-tools'),UV_PYTHON_INSTALL_DIR:path.join(root,'work','uv-python')};
const child=spawn(process.execPath,[path.join(root,'node_modules','@anna-ai','cli','dist','cli.js'),'dev','--port','5181','--slug','ai-ppt-studio','--llm-account','https://staging.anna.partners','--storage','aps'],{cwd:root,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error('启动失败：'+error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
