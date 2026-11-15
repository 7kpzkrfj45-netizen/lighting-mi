# Lighting MI · 照明企业情报

公开只读的照明企业事件网站：并购、合作、供应链与制造。无需登录、无需 GitHub 账号，也不需要下载代码。

- 网站：[https://7kpzkrfj45-netizen.github.io/lighting-mi/](https://7kpzkrfj45-netizen.github.io/lighting-mi/)
- 发布仓库：[7kpzkrfj45-netizen/lighting-mi](https://github.com/7kpzkrfj45-netizen/lighting-mi)
- 数据截至：2026-10-11；23 个已收录事件、19 家企业，部分覆盖。
- 数据版本：`9a5b00985e667a6daaed`。

## 网站如何运行

`public/` 包含静态 HTML/CSS/JavaScript 与审核后 JSON，GitHub Pages 免费托管并使用免费的 github.io 地址。用户浏览、搜索、筛选、图表和时间线不调用 AI，不连接私人后台或数据库。Agent 的采集和人工审核留在本地；本仓库不包含原 Agent 代码历史、凭证、用户或业务数据库。

## 部署

Settings → Pages → Source 选择 **GitHub Actions**。提交到 main 后，`.github/workflows/pages.yml` 先运行公开文件、字段、哈希及路径检查，再上传 `public/` 并发布。无编译或依赖安装步骤，无第三方服务器、域名或付费服务。部署状态及实际网址见 Actions 的 github-pages 环境。

## 更新资料或页面

1. 在本地 Agent 项目采集并人工审核，明确允许公开的事件 ID 与版本。
2. 用只读导出器生成完整公开快照；检查数据截至日、来源、短证据及统计口径。
3. 本地预览后将新的静态包**整体替换**本仓库 `public/`，清理已撤回详情及旧版本数据目录，不覆盖 `.git`。
4. 运行 `python3 scripts/validate_pages_release.py public`。检查 `git status`、`git diff`，确认无敏感内容；每次独立更新创建 commit 再推送 main。
5. 等待 Actions 的 Validate and publish Lighting MI 全部通过，再在普通浏览器验证页面、JSON 和事件详情。

只更新公开 JSON/静态包，不上传原始数据库、采集日志、待审队列、全文缓存、模型密钥或整个 Agent 项目。网站不会因为浏览器刷新而自动爬取；本地停止工作只影响下一次更新。

## 常见问题

- **404/部署没有运行**：检查 Settings → Pages 是否为 GitHub Actions，以及 main 是否已包含 pages.yml；在 Actions 中查看失败步骤。项目网址包含 `/lighting-mi/`，不要省略该路径。
- **数据正在更新/校验失败**：确认 public 中的 manifest 与所有 JSON 属于同一快照，不要手动只替换单个 JSON。重新运行校验后重新部署。
- **首页最近七天为空**：不等于网站坏了。页面按北京时间的有效披露日计算，旧事件在“全部历史”中；关注数据截至日期。
- **旧链接无法打开**：事件可能已撤回或未列入公开快照。只有经复核的合并映射会跳转到公开目标。
- **来源链接失效**：查看保留的短证据与出处；网站不能保证原站持续可用，也不提供原文全文。
- **图表与全行业数量不同**：统计只覆盖已收录资料；年度按确认进展去重，同一事件跨年可重复。
- **没有地图**：当前 MVP 没有地图；未审核的地理位置不会被推断为项目地点。

## 部署失败与回滚

1. 在 Actions 打开对应提交，检查校验、配置、上传或部署步骤的错误；不要跳过校验。
2. 修正后创建新 commit；仅临时网络问题可 Re-run failed jobs，观察部署环境 URL。
3. 若需回退，先核对撤回清单，确保旧快照没有会被重新公开的内容。使用 `git revert <problem-commit>` 创建恢复提交，重新校验、推送并等待 Pages 部署；不 force push、不重写历史。
4. 无可安全回退的版本时，发布经过校验的空快照或从 Pages 暂停网站，不恢复敏感内容。

公开文件、Git 历史及访问者缓存都可能被保存，首次发布前必须检查。失败的新部署不能当作已上线；以 Actions 成功记录、manifest 版本和实际浏览器访问三者核对。
