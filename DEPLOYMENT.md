# Anna staging 交付记录

- App name：叙页 · AI PPT Studio
- slug：ai-ppt-studio
- App ID：262
- 提交审核版本：1.1.0
- Version ID：627
- 提交后状态：pending_review（尚未发布）
- 环境：https://staging.anna.partners
- 开发者控制台：https://staging.anna.partners/developer

## 检查与发布

在开发者控制台打开本应用，安装/测试工作草稿或审核版本。在平台网页中检查：生成 4 页、修改后保存、关闭重开恢复、导出 PPTX。

平台网页导出经过 APS 文件存储，与 localhost 的直接下载路径不同，需要独立验收。另一普通账号的安装、使用及数据隔离也需在批准/发布后验证。

查询状态：

```powershell
npm.cmd run anna -- apps status ai-ppt-studio --account https://staging.anna.partners --json
```

管理员批准后，如果状态为 approved 且尚未发布：

```powershell
npm.cmd run anna -- apps release 1.1.0 --account https://staging.anna.partners
```

只有确认 is_published 为 true、状态为 published 后，才能将它作为已发布应用交付。管理员若在审批时同时发布，则无需重复 release。

## 源码交付

GitHub 仓库：https://github.com/Davidbei0617/ai-ppt-studio

项目使用 main 分支。提交身份使用 GitHub 用户名 Davidbei0617 及官方 noreply 邮箱。仓库不得包含 .anna、work、node_modules 或凭据。

交付时提供 GitHub URL、上述 App name 与 slug，并注明真实发布状态。

## 1.1.0 上传记录

新版工作包已上传，12 个文件，约 564.4 KB，bundle ready；已创建不可变版本 1.1.0（627），并将审核候选从 1.0.0 切换为 1.1.0。平台返回 pending_review，尚未公开发布。旧版 1.0.0 保留。
