# Lighting MI 网站维护指南

适用范围：本地 Agent / 审核 + 独立公开 JSON 仓库 + GitHub Pages。无需新增服务器、域名或数据库。访客不调用 AI。

- 正式网站：https://7kpzkrfj45-netizen.github.io/lighting-mi/
- 公开仓库：https://github.com/7kpzkrfj45-netizen/lighting-mi
- 部署与巡检：https://github.com/7kpzkrfj45-netizen/lighting-mi/actions
- 问题追踪：https://github.com/7kpzkrfj45-netizen/lighting-mi/issues

本指南在 Agent 仓库为 docs/website-maintenance.md，在公开仓库为 MAINTENANCE.md。下文 manage.py、site/public、测试与采集命令只在私有本地 Agent 项目执行；公开仓库只有 public、scripts 和部署工具，不能运行 Agent。

## 1. 日常需要做什么

| 频率/触发 | 自动执行 | 人工负责 |
| --- | --- | --- |
| 每日北京时间 08:00 | 本地采集；完成后尝试同步已批准快照 | 检查新原文与候选，公开审核 |
| 每五分钟、本机登录运行时 | 独立同步任务重试；相同内容不重复提交 | 有凭据过期、仓库冲突时处理 |
| 每次发布 | 本地与 Actions 校验字段、哈希、引用、敏感内容，再部署 | 首次、新功能和撤回后的浏览器抽查 |
| 发布成功后及每周一 03:23 UTC | HTTP、所有快照文件、数据时效、最近部署、Chrome 交互、360/390/1440 宽度及基础性能 | 看 Actions 失败及自动创建的维护 Issue |
| 每月 | Dependabot 检查 Actions 和依赖更新 | 阅读安全告警、测试后合并更新，不自动合并 |
| 每月或 UI 大改 | 无额外付费浏览器服务 | 用真实手机和 Safari 抽查，核验代表性原文与失效链接 |

不把格式通过当作事实正确。自动检查保证结构、日期、引用、证据存在及版本一致；原文是否真实、转载是否重复、分析是否成立仍需审核。原始来源外链不逐次爬取，以免大量请求和原站限流；失效来源记 Issue 后人工核验。

部分覆盖资料的截至日较旧会在巡检摘要中提示；默认不把它当网站宕机。需要严格时效检查时使用 --strict-freshness，按实际采集承诺设置 --max-age-days。失败和待审不能推进截至日。

## 2. 更新数据：审核一次，自动发布

先在本地后台核实事实、证据、阶段、日期、分析标识。新进展未批准时网站仍保留上一批准版本。

审核清单保存在忽略的 artifacts/public-approval.json，格式见 site/README.md。它是**完整公开清单**，不是新增列表：遗漏已公开 ID 表示撤回，空 event_versions 表示撤回全部。数字须为本人复核的真实 ID 和当前版本；不能用“全部 accepted”自动生成批准。

```sh
LOCAL_DEV=1 .venv/bin/python manage.py approve_public_site --approval artifacts/public-approval.json
LOCAL_DEV=1 .venv/bin/python manage.py sync_public_site --dry-run
LOCAL_DEV=1 .venv/bin/python manage.py sync_public_site
```

批准命令冻结内容，不直接上传；同步由命令或五分钟后台任务完成。批准命令拒绝版本过期、Demo、缺少证据、私有字段等。所有名单需由维护者确认；新的日采集不会自动修改公开批准。

本地 artifacts/public-sync 中 releases/<version> 保存已校验快照，approved.json 指向当前批准版本，state.json 保存尝试、已推送及线上核验状态。目录不入 Git；备份时加密保存到独立介质。首次同步核对现有线上版本再建立基线。added/updated/retained/removed 是与最近成功上线快照的差异，历史补录不改变披露日。

无变化不重复提交，也不为了显示“今天更新”刷新生成时间。数据截至日变化可产生新快照，必须有真实检查与审核依据。只有线上 manifest 与预期版本一致且完整校验通过才记录 verified；第一次推送后 Pages 尚未完成会暂记 retry_needed，后续重试核验即可，不重复提交。

Git 提交记录历史，当前网站不同时托管全部旧版本。公开仓库 README 的首次发布日期是历史信息；实际当前范围以线上 manifest 和数据说明页为准。

## 3. 本机调度、授权与故障状态

```sh
.venv/bin/python scripts/install-local-schedule.py
```

日采集命令仅在 PUBLIC_SYNC_ENABLED=1 时触发同步，普通开发/测试默认关闭；独立 sync_public_site 命令仍只发布冻结批准。安装器会为调度显式启用。

安装本机用户的两个任务：原每日采集与独立公开同步重试。需本机时区 Asia/Shanghai，登录、联网、电脑可运行。关机/休眠不保证按时执行；已发布网站不受影响。查看本机 artifacts/daily-collector*.log、public-sync*.log 及 public-sync/state.json。运行日志不公开，不回显凭据。

独立公开仓库位于 artifacts/github-pages-release，必须 main、工作区干净、origin 为指定公开仓库。未知未推送提交、非快进冲突、dirty 状态会停止，不自动 reset、强推或覆盖人工改动。导出目录恢复文件 .public-previous 如存在，先备份，再按发布记录判断恢复，不直接删除。若进程恰在数据替换后、commit 前退出，仓库可能 dirty：备份并核对只涉及 public/data 和 manifest，校验后手动提交该批准快照，再恢复同步；不能用 git add .。

GitHub 凭据只放本地钥匙串、SSH 凭据或忽略目录中的受保护 CLI 配置。推荐单仓库最小写权限，不使用访客 JS、JSON、远程 URL、命令参数或日志保存 Token；不提交 .env、数据库、备份、原文全文、内部审核内容。首次需要维护者完成 GitHub 官方登录；授权失效在本地重新登录，不把密码或 Token 发到聊天或 Issue。

当前网络若 GitHub DNS 地址不可达，可仅在本地发布仓库设置 http.curloptResolve 到经 GitHub /meta 核实的官方地址，保持证书校验；不修改系统 DNS、关闭 TLS 或引入常驻代理。该本地连接替代配置可能随 GitHub 地址变化失效：网络恢复后删除该配置，或重新核实地址，失败不会覆盖网站。凭据助手采用本地绝对路径，工具位于忽略的 artifacts/tools，不能依赖 /tmp 中可能被清理的文件。

停用：使用 launchctl bootout 移除 com.lightingmi.public-sync / com.lightingmi.daily-collector 对应用户 LaunchAgent，再删除相应 plist。停用采集不会下线 Pages。不要给公开仓库配置本机 self-hosted runner。

## 4. 修改网页内容与新增功能

- 资料、来源、摘要、日期：在本地 Agent 审核后重新批准发布，不手改生成 JSON。
- 网页文字、样式、布局：改 site/public，运行前端测试与本地预览；由维护者显式准备、提交发布完整静态包。数据同步刻意保留线上资源，不自动发布尚未验证的网页代码。
- 新功能：先创建独立 ITER 文档，写范围、数据契约和验收，确认后在 feature/ 分支开发；不要把旧草案当批准。
- 修改 JSON 契约：同步 Pydantic、site/public-data.schema.json、导出、独立校验、网页读取与测试；现有 schema=1 兼容新增可选 reviewed_at，不移除旧字段。
- 每个独立且验证通过的修改建立 commit。内部 Agent 与公开发布仓库分别检查差异并提交，禁止把 Agent 历史推到公开仓库。

```sh
LOCAL_DEV=1 .venv/bin/python -m pytest
.venv/bin/python -m unittest discover -s tests -v
node --test site/tests/model.test.mjs demo/tests/model.test.mjs
LOCAL_DEV=1 .venv/bin/python manage.py check
LOCAL_DEV=1 .venv/bin/python manage.py makemigrations --check --dry-run
```

新增功能还应运行相应浏览器验收。PostgreSQL 并发测试需要隔离 PostgreSQL；SQLite 跳过不代表生产并发验收通过。模型规则变化还需相关标注样本评估；本轮不改模型。

## 5. 检查部署、性能和手机访问

在 Actions 看 Validate and publish Lighting MI：先校验，再配置 Pages、上传、部署；必须全部成功。Settings → Pages 应为 GitHub Actions，正式路径包含 /lighting-mi/。推送成功不等于部署成功，部署成功还要核对线上版本。

在公开仓库或本地 Agent 项目均可运行（公开仓库路径同名）：

```sh
python3 scripts/check_public_site.py
python3 scripts/site_browser_check.py
```

浏览器检查需安装 requirements.txt（公开仓库）或 requirements.lock（Agent），执行 python -m playwright install chromium；本机已有 Chrome 可设 CHROME_PATH 指向浏览器可执行文件。浏览器检查覆盖搜索空态、表格、详情与刷新、返回、企业、未知事件、数据失败、主要页面移动宽度、JS 错误和同源 GET。

基础预算：单文件 8 MiB、全快照 32 MiB、未限速 Chrome 首次渲染 15 秒内。它是退化报警，不是 Lighthouse 分数或真实移动网络 SLA；真实手机触摸、Safari、弱网与多地区访问仍需人工抽查。大量数据超过预算应先评估索引分片，不直接放宽测试。

## 6. 无法访问或检查失败

1. 区分 GitHub 平台故障、当地网络问题、部署错误和数据错误；查看 https://www.githubstatus.com/ ，尝试另一个网络。
2. 打开 Actions 对应失败步骤；不跳过校验，不反复盲目发布。
3. HTML 404：核对 Pages 设置、项目子路径和 index.html；JSON 404/哈希错误：检查是否混用了不同快照，重新发布完整包。
4. 页面能打开但日期旧：看本机是否运行、来源失败、模型配置、待审积压、批准快照、推送权限、state.json 及 Pages 结果；不要通过改日期掩盖问题。
5. 部署失败可修复后新提交，临时网络故障可 Re-run failed jobs。检查到失败会创建一个维护 Issue，重复失败不反复建同名 Issue；修复并重跑通过后人工关闭。
6. 问题记录至少包含现象、影响范围、时间、公开 commit/数据版本、失败运行链接、复现步骤、修复及验证结果。不得粘贴密钥、内部原文或本地日志全文。

周检不是全天候监控，最坏可能一周后才发现故障；个人项目先接受此成本。需要更快发现时可调整检查频率，仍需关注平台额度。

## 7. 恢复正常版本

1. 先暂停本地同步，防止旧故障批准再次覆盖回滚。
2. 记录最后正常公开 commit 与数据版本，备份当前本地状态。
3. 检查旧版本是否含已撤回或敏感内容；有则不能恢复，生成安全快照。
4. 在公开仓库使用 git revert <故障提交> 创建新恢复提交，不强推、不重写历史。若故障跨多个提交，先在隔离分支整理恢复包并核对差异。
5. 运行 python3 scripts/validate_pages_release.py public，提交推送，等待 Actions 成功，再跑 HTTP 和浏览器检查。
6. 在 Agent 中重新批准与回滚一致的安全快照，或冻结新的修复快照；核对本地 state 后恢复调度。不要只修改 state.json 假装成功。
7. 若无法安全恢复，可暂停 Pages；暴露过的密钥必须立即撤销更换，Git 删除与回滚不能保证收回公开历史或第三方副本。

## 8. 依赖、安全与费用

Dependabot 月检 Actions 与依赖，只提 PR、不自动合并。公开周检同时使用 pip-audit 检查浏览器维护工具依赖；本地 Agent 锁定依赖在升级后需独立运行 pip-audit -r requirements.lock（在隔离工具环境安装审计工具）。查看仓库 Security → Dependabot alerts；首次需仓库管理员确认依赖图/安全告警已开启。更新需运行测试和浏览器检查；有风险优先修补，无法立即升级则记录影响与临时措施。Agent requirements.lock、package.json 与运行镜像的告警需在私有本地项目独立处理，公开仓库不能代表全部依赖。

公开标准 Ubuntu Actions 和 Pages 托管免费；不选 larger runner、不买服务器或域名。产物设置短期保留，不上传截图归档或所有历史包作为长期存储。GitHub 当前 Free 提供 500 MB 产物存储、每仓库 10 GB 缓存；超额、扩大存储、私有 Actions 超出共享计算额度、大型运行器等可能产生费用。查看账户 Billing → Usage 与预算，不开付费超额。

若未来迁移私有 Actions Agent，当前 Free 为每月 12 美元共享计算额度，标准 Linux 每分钟 0.006 美元约等于 2,000 分钟；按实际账户及官方计费核实，不认为公有免费规则适用于私有 Agent。定时任务可能延迟/丢弃，公开仓库 60 天无活动会停用 schedule。

模型 API、付费数据源、自定义域名、云数据库、云服务器、商业监控或外部通知均可能另收费，本轮不新增。Agent 现有 API 花费不因 Pages 免费而消失。

官方依据（2026-11-15 核对）：https://docs.github.com/en/billing/concepts/product-billing/github-actions 、https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule 。
