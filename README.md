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

JSON 备份可从左栏“导入 JSON 草稿”恢复。支持不超过 1 MB、最多 30 页的有效草稿；导入后创建独立项目，不覆盖原项目。

## 验收进度

- 用户已确认 staging 真实 AI 生成成功。
- 用户日志证实 APS 云端写入与草稿恢复成功。
- 三种主题导出文件的页数、文字、备注、比例及 ZIP/XML 结构检查通过。
- 用户已下载并检查实际 PPTX；待验收：部署后平台文件下载与第二用户数据隔离。
- Anna 1.1.0 已上传并提交审核，当前 pending_review；公开发布状态以控制台为准。

## 开发说明

纯静态 UI，无自定义 Executa 依赖。平台 SDK 从宿主官方地址加载。生成内容以 textContent 渲染，不执行 AI 输出 HTML。原脚手架工具已移到 work/，不会自动发布。

导出使用 PptxGenJS（MIT），浏览器依赖随包分发，不依赖第三方 CDN。许可见 bundle/vendor。image-size 覆盖到已修复的 2.1.0；当前产品仅支持文本和形状导出。

不要将 .anna、work、node_modules、凭据或 .env 提交到 GitHub。

## 平台与源码

- 源码：https://github.com/Davidbei0617/ai-ppt-studio
- Anna staging App name：叙页 · AI PPT Studio
- slug：`ai-ppt-studio`
- 当前源码版本：`1.1.0`；平台公开版本和审核状态请查看控制台。
- 控制台：https://staging.anna.partners/developer

发布步骤与待验收事项见 DEPLOYMENT.md。


## 1.1.0

版本 1.1.0 包含以下更新。Anna 已接收新版，审核候选为 1.1.0；旧的 1.0.0 版本保留。源码同步到 main。

- 项目列表：新建、复制、重命名、独立自动保存、移入回收站与恢复。每次 AI 生成创建新项目，不覆盖已有项目。
- 旧稿迁移：首次读取 1.0 的 decks/current（本地为旧 localStorage key）并复制到独立项目，保留旧键。
- 版式：封面、内容、双栏对比、步骤流程、总结。AI 返回版式，用户可逐页切换；PPTX 保留所有要点与备注。
- 单页改写：精简、专业表达、补充案例。一次至多 1000 输出 tokens，失败不自动重试；候选预览后可采用或保留原页，支持撤销。
- 存储：projects/index-v2 保存列表；projects/<uuid> 保存独立草稿。使用 etag 防止旧窗口静默覆盖新稿；出现冲突需先备份当前内容、刷新再处理。

验收建议：先用免费示例测试项目切换、改名、回收站与五种版式导出，再用一次真实单页改写验证预览/采用/撤销。不必重新生成整份 PPT。

已完成模块测试、DOM 流程模拟及五种版式的 PPTX 渲染检查；新版 Anna 云端迁移和真实单页改写仍需在调试页面验收。DOM 模拟不代表真实浏览器视觉检查。


### 草稿导入、放映与自定义改写

- 左栏“导入 JSON 草稿”：选择应用备份的 .json 文件，校验后创建独立项目。导入数据只保留应用支持的字段，失败不会改动当前项目。
- 顶部“放映”：从当前页开始。方向键、PageUp/PageDown、空格翻页，Home/End 跳转首尾，Esc 或“退出放映”结束。放映使用当前项目的快照，不修改正文，退出后编辑器定位到最后展示页。
- 放映中的“全屏”使用浏览器 Fullscreen API；manifest 声明 fullscreen。宿主或浏览器拒绝全屏时继续窗口内放映。修改 manifest 后需要重启本地 Anna 调试环境，以重新加载 iframe 权限。
- “AI 改写”中的自定义输入框：填写 1–500 字要求后发起单页改写；先预览，再采用并保存，可撤销。空输入不发起付费请求，失败不自动重试。

新增测试覆盖 JSON 错误/大小/结构校验和导入隔离、放映边界/键盘/退出/全屏回退、自定义要求传递及采用保存流程。原生全屏和新版真实 AI 自定义改写仍需在实际浏览器/Anna 中验收。
