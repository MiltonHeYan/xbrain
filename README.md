# xstash

**把 X 书签，变成值得回看的收藏。**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

xstash 是 [Milton / HeYan](https://github.com/MiltonHeYan) 发起的 **MIT 开源 Agent Skill + 本地书签图库**。用你自己的 Agent 读取已授权的 X 书签，整理摘要与标签，再放进安静、清晰的黑白图库。

一个搜索框、一面卡片墙、只读详情。Agent 负责整理，xstash 负责保存和呈现。没有内置模型、模型密钥输入框、X 登录页或手动导入界面。

**推荐组合：[你的 Agent](#step-1准备一个兼容的-agent) + [xstash Skill](#step-2安装-xstash-skill) + [CoreSpeed MCP](#a推荐corespeed-mcp)。** CoreSpeed 提供已连接账号的工具，让你从授权到第一批书签少做一些接入工作。也可自行接入官方 X API，详见下方两条路径。

## Step 1：准备一个兼容的 Agent

<p>
  <a href="https://code.claude.com/docs/en/overview"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/claude-code-dark.svg"><img src="docs/assets/agents/claude-code-light.svg" alt="Claude Code" height="22"></picture></a>
  &nbsp;&nbsp;
  <a href="https://developers.openai.com/codex/"><img src="docs/assets/agents/codex.png" alt="Codex" width="32" height="32"></a> Codex
  &nbsp;&nbsp;
  <a href="https://cursor.com"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor-light.svg" alt="Cursor" height="30"></picture></a> Cursor
  &nbsp;&nbsp;
  <a href="https://openclaw.ai"><img src="docs/assets/agents/openclaw.svg" alt="OpenClaw" width="32" height="32"></a> OpenClaw
</p>

你需要一个能读取 `SKILL.md`、执行本地命令、访问授权数据源的 Agent，以及 **Git、Node.js 22.12+ 和现代浏览器**。运行图库的终端与 Agent 必须能访问同一文件夹和 `127.0.0.1` 服务。

| Agent | Skill 安装目录 | 官方说明 |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/xstash/` | [Skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/xstash/` | [Skills](https://developers.openai.com/codex/skills/) |
| Cursor | `~/.cursor/skills/xstash/` | [Skills](https://cursor.com/docs/skills) |
| OpenClaw | `~/.openclaw/skills/xstash/` | [Skills](https://docs.openclaw.ai/tools/skills) |

这些是提供 Skill 加载机制的主要 Agent，不代表所有版本、运行环境和 MCP 配置都已逐一验收。客户端仍需允许命令执行；使用路径 A 时，还需在**当前 Agent** 配好远程 MCP/OAuth。一个客户端已连接，不代表另一个自动继承。其他 Agent 满足相同能力要求时，可直接读取本项目的绝对路径 `SKILL.md`。

## Step 2：安装 xstash Skill

**安装整个仓库，不要只复制 `SKILL.md`。** Skill 使用仓库内的应用、脚本和数据格式说明；xstash 目前没有发布可直接安装的 npm 包。

下面以 Codex 的用户级 Skill 目录为例（macOS / Linux / WSL shell）。Claude Code、Cursor、OpenClaw 用户先把第一行替换为上表对应目录；目录已存在时先检查旧安装并备份数据，不要覆盖。

```sh
XSTASH_HOME="$HOME/.agents/skills/xstash"
git clone https://github.com/MiltonHeYan/xstash.git "$XSTASH_HOME" &&
  cd "$XSTASH_HOME" &&
  npm ci &&
  npm start
```

`npm start` 自动构建并启动图库。打开终端显示的地址，默认 **http://127.0.0.1:4317**，保持服务运行。首次本地库为空。按客户端说明重新加载 Skill；若没有自动发现，把安装目录中 `SKILL.md` 的绝对路径交给 Agent。

Windows 原生 PowerShell 也可在选择好的 Skill 目录中 `git clone`，进入目录后执行同样的 `npm ci`、`npm start`。不要原样粘贴上面的 shell 变量语法。

## Step 3：授权访问你的 X 书签

选择一条路径。两者都需要书签所属用户的授权；公开帖子搜索无法替代个人书签权限。

### A（推荐）：CoreSpeed MCP

适合希望先用起来、由服务统一管理连接的用户。无需为了 xstash 自行创建 X 开发者 App 或实现 OAuth 回调。xstash 本身不接收 CoreSpeed 或 X 凭据。

**1. 添加 MCP。** 在 [CoreSpeed](https://corespeed.io) 注册或登录，并按 [官方安装说明](https://corespeed.io/SKILL.md) 在使用 xstash 的同一个 Agent 中添加服务器。Claude Code 一行安装：

```sh
claude mcp add corespeed https://api.corespeed.io/mcp --transport http --scope user
```

然后在 Claude Code 中运行 `/mcp`，选择 `corespeed`，完成浏览器 OAuth 登录。安装服务器不等于已完成授权。

Codex：

```sh
codex mcp add corespeed --url https://api.corespeed.io/mcp
codex mcp login corespeed
```

Cursor 可在用户级 `~/.cursor/mcp.json` 合并以下服务器配置，再按客户端提示认证；保留原有配置。其他客户端参考 [CoreSpeed 官方 Skill](https://corespeed.io/SKILL.md)，使用同一 HTTP 端点 `https://api.corespeed.io/mcp`，不要凭空套用其他客户端的配置格式。

```json
{
  "mcpServers": {
    "corespeed": {
      "type": "http",
      "url": "https://api.corespeed.io/mcp"
    }
  }
}
```

**2. 连接 X。** 打开 [CoreSpeed Connectors](https://app.corespeed.io/connectors)，连接你要读取的个人 X 账号，在浏览器完成服务提示的授权。重新加载工具后，让 Agent 核验当前身份、连接账号与书签工具 schema。账号不明确或授权不完整时先停下，不要切换到别人的账号。

**3. 让 Agent 整理第一批。** 把下列请求中的路径替换为真实绝对路径：

> 使用 /绝对路径/xstash/SKILL.md，通过我在当前 Agent 已授权的 CoreSpeed 个人 X 账号读取最多 5 条书签。保留原文，生成忠实的中文摘要和 1–4 个标签，导入 http://127.0.0.1:4317 并读回核验。报告实际读取、新增和验证数量，以及缺失字段与覆盖范围。不要用演示数据，不要修改 X，不要读取历史记忆；账号不明确或缺少授权时停下说明。

刷新图库即可查看。摘要使用的是你选择的 Agent；xstash 不包含模型服务或模型订阅。

**费用与范围。** 截至 **2026-10-03**，CoreSpeed [价格页](https://corespeed.io/pricing)列出 Free：$0，3,000 credits / 90 天；Pro：$20 / 月，10,000 credits / 月。[计费文档](https://corespeed.io/docs/billing)给出的折算是 1,000 credits = $1。公开价格页没有明确的书签工具单价，因此这里不承诺“每次同步几毛钱”，也不把公开帖子读取费率当作书签费率。先小批量运行，再在 [Billing](https://app.corespeed.io/billing) 核对实际消耗和预算；以当前报价为准。

当前项目验证过的 `twitter__get_my_bookmarks` schema（2026-10-03 复核）仅有 `account` 和 `max_results`，没有分页输入。即使响应带 `next_token`，也不能自行添加分页参数。因此当前 CoreSpeed 工作流是**部分书签快照**，不保证全历史同步。缺失的作者和媒体信息不会被编造；每次运行应重新检查实际 schema。

### B：自行接入官方 X API

适合希望直接管理 X 开发者 App、权限与计费的开发者。**当前 xstash 没有内置官方 X API OAuth 客户端或拉取适配器。** 这条路径需要你或你的 Agent 编写、审查并维护获取数据的部分，再把响应交给现有 JSON / stdin 桥接；不是第二套开箱即用的登录按钮。

1. **开通开发者访问。** 用你的 X 账号进入 [Developer Console](https://console.x.com)，完成当前注册、用途说明与所需条款。按当前控制台的 New App 流程创建 App 并填写名称、描述和用途；若你的控制台要求 Project，再创建或选择 Project。参考 [开发者 App 文档](https://docs.x.com/fundamentals/developer-apps)。
2. **配置 App。** 启用 OAuth 2.0 用户认证，选择与你实现相符的应用类型，保存 OAuth 2.0 Client ID（confidential client 另需 Client Secret），登记准确的回调 URL 和网站 URL。回调由你实现，不能直接用 xstash 图库地址冒充回调处理器。官方建议本地回调使用 `http://127.0.0.1`；授权请求的 URI 必须与登记值完全一致。
3. **确认权限和预算。** 读取书签需要 `bookmark.read tweet.read users.read`；需要刷新令牌时再加 `offline.access`。只读流程不需要 `bookmark.write`。在控制台查看端点权限、充值 credits 并设置预算；X 当前采用预付 credits、按量计费，不应照搬旧版 Basic / Pro 月费教程。
4. **完成用户 OAuth。** 按 [OAuth 2.0 Authorization Code + PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code) 实现：生成随机 `state` 和 PKCE verifier/challenge，跳转用户授权页；验证回调 `state`，用返回的 code 和 verifier 换取用户 access token。仅在请求了相应权限并获得 refresh token 时实现刷新。凭据保留在你的受控凭据存储中，不能放进仓库、书签 JSON 或公开日志。
5. **读取本人的书签。** 用该用户 token 调用 `GET /2/users/me` 确认用户 ID，再调用 `GET /2/users/{id}/bookmarks`。App-only bearer token 不足以读取私有书签；路径 ID 必须对应授权用户。按 [书签读取文档](https://docs.x.com/x-api/users/get-bookmarks) 请求需要的字段、author/media expansions，每页 `max_results` 为 1–100，后续页使用返回的 `next_token` 作为 `pagination_token`。当前[读取限流](https://docs.x.com/x-api/fundamentals/rate-limits)为每用户每 15 分钟 180 次，遇到 429 遵循 `x-rate-limit-reset`；限流和计费是不同限制。不要把 API 返回范围表述为完整历史备份。
6. **接入 xstash。** 将成功的 X-style JSON 响应（`data`、可选 `includes` / `meta`）保存为私人文件，或转换为 [标准 envelope](docs/IMPORT_FORMAT.md)。在 Step 2 的项目目录执行下方命令。桥接会导入并读回核验；拒绝错误响应，私密 token 不应出现在输入中。

```sh
node scripts/agent-bridge.mjs doctor http://127.0.0.1:4317
node scripts/agent-bridge.mjs import http://127.0.0.1:4317 < /private/path/bookmarks.json
```

**官方 X API 费用。** [当前官方价格](https://docs.x.com/x-api/getting-started/pricing)（2026-10-03 核对）为按资源计费：标准 Post read 为 **$0.005 / 资源**；符合 **Owned Reads** 条件，即认证用户同时拥有开发者 App 时，自己的书签读取为 **$0.001 / 资源**。例如仅按 100 个符合条件的书签资源估算为 **$0.10**，这不是“一次 API 请求 $0.10”的固定报价；额外用户查询、其他资源及 Agent 模型费用另计。按实际端点、资源分类和控制台账单核对。

### 两条路径怎么选？

| 对比项 | A：CoreSpeed MCP（推荐） | B：官方 X API 自建 |
| --- | --- | --- |
| 接入流程 | 添加 MCP → 登录 → 连接 X → 调用 Skill | 开发者注册 → App 配置 → PKCE 用户授权 → 实现读取 → 接入桥接 |
| 凭据管理 | 在 CoreSpeed 与 Agent 的授权体系中管理；xstash 不保存 | 自行安全保存 App 配置、用户 token，并处理刷新和撤销 |
| 费用 | CoreSpeed 方案 / credits；书签实际消耗以控制台为准 | X 预付 credits 按资源计费；Owned Reads 有资格条件 |
| 维护 | CoreSpeed 管理上游连接；仍需处理重授权、额度和 schema 变化 | 自行维护 OAuth、分页、重试、限流、字段映射和 API 变化 |
| 书签范围 | 当前已验证工具无分页输入，仅部分快照 | 官方端点支持分页；仍受端点范围、可见性和额度限制 |
| xstash 支持状态 | 根目录 Skill 已包含该工作流与本地桥接 | 已有标准 JSON / stdin 导入；未内置 X OAuth / 拉取适配器 |

两条路径都另需你自己的 Agent / 模型服务。选择 CoreSpeed 的主要理由是降低接入和维护负担，不是未经验证的价格承诺。

## 你会得到什么

- 黑白卡片图库、单一关键词搜索、只读详情。
- Agent 生成有来源记录的摘要与标签；原文与摘要分别保留。
- 按字符串 ID 去重和合并；重复快照不会删除这次未出现的收藏。
- 本地磁盘保存、CLI 导出备份与合并恢复；已有笔记、收藏和注释继续保留。
- 默认不加载第三方图片。详情中明确开启后，仅在当前详情会话加载。

目前不提供自动后台同步、全历史抓取、语义搜索、跨设备同步、多用户系统、X 写入、视频播放器或手动导入/编辑 UI。项目仍在早期，完整限制见 [数据格式](docs/IMPORT_FORMAT.md) 与 [隐私说明](docs/PRIVACY.md)。

## 本地数据、备份与升级

Node 服务仅监听 `127.0.0.1`，默认保存到项目内 `data/bookmarks.json`。它没有生产环境登录认证，不要通过公网隧道或反向代理公开私人库。书签虽存本地，使用 Agent / CoreSpeed 处理时仍受这些服务各自的数据处理条款约束；“本地优先”不代表整个处理链离线。

从项目目录运行：

```sh
node cli.mjs stats
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
node cli.mjs --help
```

`export` 不覆盖已有文件；`restore` 合并而非清空替换。普通导入每批最多 10 MiB / 10,000 条；完整本地库及备份恢复最多 100 MiB / 50,000 条。需要精确恢复副本时，恢复到新的库路径。CLI 可用 `--store`，服务可用 `BOOKMARK_STORE` 指定私人文件。CLI / 桥接在新安装或源码更新后单独运行前，先执行 `npm run build`。

从旧名 Commonplace 升级时先备份旧 `data/bookmarks.json`，用备份副本验证。v1 数据格式与 `commonplace.library.v1` 浏览器存储键保持兼容。可通过 `BOOKMARK_STORE=/绝对路径/旧库.json npm start` 选择原库；不要用新目录的空库覆盖它。

静态构建 `dist/` 不包含私人 `data/`，也没有 Node API。静态预览展示虚构样例，不能代替本地真实书签库；已有浏览器库仍按域名独立保存。开启外部图片会向图片主机发送网络请求，点击原文会访问 X。

## 开发与贡献

```sh
npm ci
npm run check
npm test
npm run build
```

技术栈：严格 TypeScript、React、Vite、Node HTTP 服务；无额外数据库。参见 [架构](docs/ARCHITECTURE.md)、[贡献指南](CONTRIBUTING.md)、[测试](docs/TESTING.md)、[Agent 工作流](docs/SKILL.md) 和 [独立验收](docs/CLEAN_AGENT_ACCEPTANCE.md)。测试 fixtures 都是虚构数据，测试无需真实 X 或 CoreSpeed 凭据。

## 许可与致谢

[MIT License](LICENSE)。由 [Milton / HeYan](https://github.com/MiltonHeYan) 发起，欢迎贡献。MIT 覆盖本项目代码与自创示例，不授予第三方帖子、媒体或商标的使用权。

xstash 是独立开源项目。Claude、Codex、Cursor、OpenClaw、X 和 CoreSpeed 的名称及标识属于各自权利人；[官方标识来源](docs/assets/agents/README.md)。展示用于识别兼容工具，不表示官方合作、认证或背书。服务费用、权限与条款以各服务当前说明为准。
