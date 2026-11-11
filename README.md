# 叙页 AI PPT Studio

基于 Anna staging 的 AI PPT 制作应用。支持主题生成、文字编辑、页面管理、三套主题、云端草稿及可编辑 PPTX 导出。

## 运行

- `npm.cmd ci` 安装锁定依赖，`npm.cmd run build` 同步浏览器导出组件。
- `npm.cmd run preview`：http://127.0.0.1:5180 ，本地免费示例和 PPTX 导出。
- `npm.cmd run dev:anna`：http://localhost:5181 ，官方 Anna 调试环境、真实 AI 和 APS 云端存储；需要先通过 `npm.cmd run anna -- login --host https://staging.anna.partners` 登录。
- `npm.cmd test`：生成与错误处理、沙箱确认框、实际浏览器版导出库与文件结构、平台上传下载模拟检查。
- `npm.cmd run validate`：Anna 配置严格校验。

## 使用

填写主题、受众与 4/6/8 页，点击 AI 生成。页面内确认后会消耗当前用户额度；一次请求，不自动重试。失败保留当前草稿。

编辑标题、要点、备注，切换主题；支持增加、复制、排序、删除和撤销删除。Anna 环境保存到当前用户的应用存储；独立预览保存到本机浏览器。

点击右上角“导出 PPTX”，生成 16:9 演示文稿，包含可编辑标题、正文与演讲备注。字体使用 Microsoft YaHei，接收设备缺少该字体时会使用其替代字体。部署后的 Anna 环境经 files.upload_init、PUT、upload_finalize、download 发起下载；localhost 调试环境与独立预览直接下载（平台 R2 跨域策略不允许 localhost 上传）。生产 manifest 显式允许平台 R2 源用于上传。导出不调用 AI，文件占用 Anna 存储额度。下载失败可再次点击重试；内容未变时复用已上传文件。

JSON 备份保留完整结构，目前尚无 JSON 导入入口。

## 验收进度

- 用户已确认 staging 真实 AI 生成成功。
- 用户日志证实 APS 云端写入成功；重新打开恢复需实际验收。
- 三种主题导出文件的页数、文字、备注、比例及 ZIP/XML 结构检查通过。
- 待验收：浏览器平台下载、PowerPoint/WPS 打开与编辑、第二用户隔离测试。
- 待交付：GitHub 源码仓库、上架资料、提交审核及正式发布状态。

## 开发说明

纯静态 UI，无自定义 Executa 依赖。平台 SDK 从宿主官方地址加载。生成内容以 textContent 渲染，不执行 AI 输出 HTML。原脚手架工具已移到 work/，不会自动发布。

导出使用 PptxGenJS（MIT），浏览器依赖随包分发，不依赖第三方 CDN。许可见 bundle/vendor。image-size 覆盖到已修复的 2.1.0；当前产品仅支持文本和形状导出。

不要将 .anna、work、node_modules、凭据或 .env 提交到 GitHub。

## 平台与源码

- 源码：https://github.com/Davidbei0617/ai-ppt-studio
- Anna staging App name：叙页 · AI PPT Studio
- slug：`ai-ppt-studio`
- 版本：`1.0.0`（已上传并提交审核，尚未发布；以平台最新状态为准）
- 控制台：https://staging.anna.partners/developer

发布步骤与待验收事项见 DEPLOYMENT.md。
