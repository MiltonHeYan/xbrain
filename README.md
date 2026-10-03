# xstash

Formerly Commonplace. Existing local libraries remain compatible.

**把值得保存的内容，变成值得回看的收藏。**

一个本地优先的 X 书签画廊，使用严格 TypeScript、React、Vite 和轻量 Node HTTP 服务。带上你自己的 Agent 和 CoreSpeed MCP：Agent 读取授权账号的书签，按需整理摘要与标签；xstash 只呈现黑白书签图库、关键词搜索和只读详情。

没有内置模型、模型 API Key 输入框、X 登录或手动导入界面。书签由已授权 Agent 通过 Skill 和本地桥接写入。

[English quick start](#english-quick-start) · [Agent 工作流](docs/SKILL.md) · [数据格式](docs/IMPORT_FORMAT.md) · [隐私与安全](docs/PRIVACY.md)

## 安装 Skill 并整理自己的书签

需要 Node.js 22.12+、一个能执行本地命令的 Agent，以及该 Agent 中已授权的
CoreSpeed MCP 和个人 X 连接。xstash 不保存这些服务的密钥。

```sh
git clone https://github.com/MiltonHeYan/xstash.git
cd xstash
npm ci
npm start
```

首次执行 `npm ci` 安装项目依赖。把本目录的 `SKILL.md` **绝对路径**交给一个新 Agent；
保留整个目录，不要只复制 Skill 文件。可直接这样说：

> 使用 /绝对路径/xstash/SKILL.md，通过我在当前 Agent
> 已授权的 CoreSpeed 连接，读取个人 X 账号最多 5 条书签，生成简短中文摘要
> 和标签，导入 http://127.0.0.1:4317 并读回核验。不要使用演示数据，不要修改
> X，不要读取历史记忆；账号不明确或授权缺失时停下说明。

根 Skill 会指导 Agent 查验当前账号和工具 schema，并通过本地桥接直接导入。
如需自动发现，请按你的客户端规则将**整个干净源码目录**安装为
`xstash` Skill；不要覆盖现有安装或复制私人 `data/`。
MCP 安装和 OAuth 授权按 [CoreSpeed 当前官方说明](https://corespeed.io/SKILL.md)
由用户在目标客户端完成。连接在一个 Agent 可用，不代表另一个 Agent 自动继承。

## 先跑起来

需要 **Node.js 22.12 或更新版本**和现代浏览器。首次运行 `npm ci` 安装锁定依赖；之后统一使用 `npm start`，自动编译并启动。没有数据库或额外后台服务。

解压源码包后，在项目目录运行：

```sh
cd xstash
npm ci
npm start
```

打开终端显示的地址，默认是 **http://127.0.0.1:4317**。本地库初始为空；让已授权 Agent 使用根目录 Skill 同步书签，随后刷新页面。界面只保留搜索、图库和详情。

想先试一下？另开一个终端，从同一目录导入完全虚构的样例，随后刷新页面：

```sh
node cli.mjs import examples/synthetic-bookmarks.json
node cli.mjs stats
```

这会把样例写入当前本地库。不要把样例当成真实 X 帖子。仅用于测试的独立库可以用 `--store` 指定，见下方。

## 已实现

- 黑白卡片图库、单一关键词搜索和只读详情
- 无分类侧栏、主题标签页、多层筛选、手动导入或编辑界面
- Agent 通过 Skill/API/CLI 写入书签，按 ID 去重、合并
- 保留本地笔记、收藏与已有注释；原始内容有新版本时更新
- CLI 导入、统计、导出、备份合并恢复
- 区分原始内容、导入的摘要、Agent 生成的摘要和用户编辑
- 本地 Node 服务的磁盘存储，以及静态预览的浏览器存储
- 默认不加载外部图片，可为当前页面会话明确开启
- 响应式界面和纯虚构演示内容

这是可运行的早期原型。没有自动后台同步、全历史抓取、语义搜索、多用户系统、跨设备同步或对 X 的写入操作。视频链接可留在数据中，画廊主要展示文本和图片，不提供视频播放器。

## 用自己的 Agent + CoreSpeed

交给空白 Agent 的入口现在是根目录 **[SKILL.md](SKILL.md)**。保留整个项目文件夹；仅复制 `docs/SKILL.md` 不包含执行桥接。安装与独立验收见 **[CLEAN_AGENT_ACCEPTANCE.md](docs/CLEAN_AGENT_ACCEPTANCE.md)**。Agent 可把实际读取并整理的书签直接送入正在运行的本地图库，不需要用户手动粘贴 JSON。

1. 让你的 Agent 阅读 **[CoreSpeed 官方最新设置说明](https://corespeed.io/SKILL.md)**，按该客户端的当前流程完成配置。在 CoreSpeed 中连接你要读取的 X 账号。已有连接可以复用。不要把凭据粘贴到 xstash。
2. 把本项目的 **[docs/SKILL.md](docs/SKILL.md)** 交给 Agent 阅读。它是书签导入工作流，与 CoreSpeed 自身的安装说明是两份不同文件。
3. 要求 Agent 先读取一个小批次，说明当前连接器能够返回的范围；如果你需要，再生成忠实于原文的摘要与标签。
4. Agent 通过根 Skill 的本地桥接直接导入，并核对处理数量和警告；用户无需搬运 JSON。

可以直接给 Agent 这段要求：

> 阅读项目中的 docs/SKILL.md。使用我明确指定的 CoreSpeed X 账号，只读获取连接器当前支持的一小批书签。先检查工具 schema 和错误，不要猜测分页参数，不要声称是全历史备份。保留字符串 ID 和原文；为每条内容生成简短忠实摘要和 1–4 个标签，并记录真实的 Agent 名称、生成时间和依据。缺少作者或图片时不要编造。把结果保存为不含任何凭据的私人 JSON 文件，告诉我记录数量、缺失字段和覆盖限制。不要发帖、点赞或更改 X 书签。

### 当前连接器限制

2026-10-02 验证的 `twitter__get_my_bookmarks` schema 只有 `account` 和 `max_results`。返回值可能带 `next_token`，但该版本没有接收它的输入参数。因此本流程是**部分书签快照**，不是全历史同步。运行前应重新查看实际 schema；不要自行构造分页参数。

验证的样本没有作者和图片展开数据。缺少的作者会显示为未知，图片不会凭空生成。可在用户授权范围内按需读取额外元数据，但不能把未经验证的内容补成事实。X、CoreSpeed 或 Agent 服务可能有额度、费用与账号权限限制；本项目不包含这些服务。

## 从旧版升级

先备份原 `data/bookmarks.json`，不要覆盖或删除它。在新目录运行时，可使用
`BOOKMARK_STORE=/绝对路径/原项目/data/bookmarks.json npm start` 明确选择旧库；
首次验收请使用私人备份副本。v1 JSON 和浏览器 `commonplace.library.v1` 存储键
不变，不需要转换数据。`npm start` 在项目根目录构建 `.build/` 和 `dist/`；
构建不读取或打包私人 `data/`。CLI/桥接单独执行前先运行 `npm run build`。

## CLI 与备份

以下命令均从项目目录执行：

```sh
node cli.mjs import /private/path/snapshot.json
node cli.mjs stats
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
node cli.mjs --help
```

- 普通导入：最多 **10 MiB / 10,000 条**每批。
- 完整本地库：最多 **100 MiB / 50,000 条**；浏览器实际可用空间通常更小。
- `restore` 接受版本 1 的收藏库备份，以**合并**方式恢复；不会删除当前库中已有的记录，也不会覆盖已有本地注释。需要精确恢复副本时，恢复到一个尚不存在的新库路径。
- `export --output` 拒绝覆盖已存在的文件。省略 `--output` 会输出到标准输出，注意不要把私人书签写入共享日志。
- Agent 桥接与普通 CLI 导入都使用单批限制。较大的备份请使用 CLI `restore`。
- 重复导入不会因为某条内容本次没有出现就删除它。

指定独立数据文件：

```sh
node cli.mjs import examples/synthetic-bookmarks.json --store /private/path/test-library.json
node cli.mjs stats --store /private/path/test-library.json
```

让服务使用该文件（macOS / Linux shell）：

```sh
BOOKMARK_STORE=/private/path/test-library.json PORT=4318 npm start
```

PowerShell：

```powershell
$env:BOOKMARK_STORE = 'C:\private\test-library.json'
$env:PORT = '4318'
npm start
```

CLI 和服务的默认库都在**项目目录**的 `data/bookmarks.json`，不会因为当前工作目录不同而另建一个默认库。显式传入的相对路径仍相对于当前工作目录；私人库建议使用绝对路径。CLI 用 `--store`，服务用 `BOOKMARK_STORE`，不要混淆。

## 本地运行与静态预览

**本地 Node 服务**：仅监听 `127.0.0.1`；数据写入项目的 `data/bookmarks.json`，可用 `BOOKMARK_STORE` 更改路径。它没有用户登录或生产环境认证，不应通过隧道或反向代理公开到互联网。

**静态预览**：没有 Node API。首次打开显示完全虚构的演示书签；可搜索和查看详情，不提供手动导入或编辑。已有浏览器本地库仍可读取，存储键保持兼容；不同域名和浏览器的数据互不相通。真实收藏请在本地 Node 服务中由 Agent 通过 Skill 写入。

构建可独立托管的静态文件：

```sh
npm run build
```

结果在 `dist/`，不包含 `data/`。使用站点根路径托管；不是双击 HTML 或任意子目录部署。构建不会发布或上传网站。托管时需要确认平台是否支持构建产物中的 `_headers`，否则自行配置等效安全响应头。敏感收藏建议使用自己审查过的本地源码。

外部图片默认关闭；在详情中勾选 **Show external images** 后才从第三方主机加载，主机会收到你的 IP 地址，关闭详情后会重新关闭。原始链接仍会在点击时访问相应网站。

加载数据失败时界面会显示错误，不会悄悄用空库覆盖原库。详情见 [隐私与安全](docs/PRIVACY.md)。

## 开发与验证

架构与贡献边界见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

```sh
npm run check
npm test
npm run build
```

- `src/client/`：React 界面、组件、样例和浏览器数据适配
- `src/shared/`：严格数据模型、归一化、校验和合并逻辑
- `src/server/`：原生 Node HTTP 服务、CLI、原子文件写入与进程间锁
- `src/agent/bridge.ts`：仅向显式 loopback origin 导入并读回核验
- `server.mjs` / `cli.mjs` / `scripts/agent-bridge.mjs`：保留的兼容入口，执行编译后的 TypeScript
- `tests/`：导入、合并、CLI 和 HTTP 测试
- `docs/` / `examples/`：工作流、格式说明与纯虚构输入

测试不需要 X 账号或 CoreSpeed 凭据。`npm test` 先构建，再运行原有 Node 回归及 React Testing Library/Vitest 组件回归。JSDOM 仍属于模拟，不能替代真实浏览器验收。参见 [验证说明](docs/TESTING.md) 和 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与状态

[MIT](LICENSE)。xstash 是独立原型；X 和 CoreSpeed 的服务及品牌属于各自所有者，相关条款独立适用。MIT 许可覆盖本项目代码与自创示例，不会给你额外的第三方内容权利。

`package.json` 保留 `private: true`，避免误发到 npm；这不限制 MIT 许可下的源码使用。当前源码包没有自动发布步骤，也没有绑定虚构的项目仓库地址。

---

## English: install the skill and use your bookmarks

Requirements: Node.js 22.12+, an agent with local command execution, and an authorized
CoreSpeed MCP connection with your personal X account in that same agent.

```sh
git clone https://github.com/MiltonHeYan/xstash.git
cd xstash
npm ci
npm start
```

Install the locked project dependencies with `npm ci` once. Give a fresh agent the absolute path to the root
`SKILL.md` and keep the entire source folder together. For example:

> Use /absolute/path/xstash/SKILL.md. With my authorized
> CoreSpeed connection, fetch up to five personal X bookmarks, generate grounded
> summaries and tags, and import them into http://127.0.0.1:4317. Verify read-back.
> Do not use demo data, persistent memory, or X mutation tools. Stop if the account
> is ambiguous or authorization is missing.

For automatic skill discovery, install the whole clean source folder as
`xstash` in your client's supported skill directory. Do not overwrite
an existing installation or copy private data. Configure CoreSpeed and complete
OAuth using its [current official instructions](https://corespeed.io/SKILL.md).
The agent sends enriched JSON directly to the running gallery through the bundled
bridge; the user does not need to manually import a demo file.

## Validation / 验收状态

- Migration validation: strict TypeScript (application, React tests and config),
  Vite production build, 55 Node regressions and 31 React component tests passed.
  This retains all 53 original Node tests and all 25 original DOM scenarios, plus
  migration regressions. Committed fixtures are synthetic. Run `npm run typecheck`
  and `npm test` for the current checkout.
- Independent fresh-agent acceptance against the TypeScript migration used five
  actual authorized bookmarks and
  a private, initially empty store with `BOOKMARK_STORE` and `PORT=0`. The first
  import added five; read-back and generated annotation matches were 5/5.
  A repeat added zero; total and unique IDs remained five. API and stored fields
  matched, and the existing local library's hash stayed unchanged. The temporary
  test service and private test directory were removed.
- Public source and examples contain no private account identity or live bookmark
  records. These acceptance counts do not imply full-history coverage.
- The current bookmark tool exposes no pagination input. Imports remain partial
  snapshots. Actual browser visual/responsive QA remains unverified.

独立验收通过了真实读取、空库首次新增、摘要标签写入、读回和重复去重；
测试未改变原有私人库。尚未完成真实浏览器视觉/响应式验收。

## Upgrading from v0.1

Back up the old `data/bookmarks.json` first. The v1 JSON format and browser storage
key remain unchanged; there is no data rewrite or reset. Validate against a private
copy before switching. To use a specific existing library, run
`BOOKMARK_STORE=/absolute/private/path/bookmarks.json npm start`.
Build outputs `.build/` and `dist/` never include `data/`. Direct CLI/bridge commands
require `npm run build` after installation or source updates.

## English quick start

xstash is a local-first X bookmark gallery. Bring your own agent and CoreSpeed MCP connection; the agent fetches authorized bookmarks and optionally adds grounded summaries and tags. The gallery itself makes no model calls and stores no service credentials.

**Requirements:** Node.js 22.12+ and a modern browser. Run `npm ci` once. `npm start` compiles the TypeScript service, builds the React UI with Vite, and starts the loopback server. No database or extra background service is required.

```sh
cd xstash
npm ci
npm start
# Open http://127.0.0.1:4317
```

In another terminal, optionally import fictional examples and refresh:

```sh
node cli.mjs import examples/synthetic-bookmarks.json
node cli.mjs stats
```

Use the [current official CoreSpeed setup instructions](https://corespeed.io/SKILL.md), then give your agent the [bookmark workflow](docs/SKILL.md). Keep real input files and credentials out of this repository. Import from the UI or CLI; export regular backups.

```sh
node cli.mjs import /private/path/snapshot.json
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
```

**Important limits:** the connector schema verified on 2026-10-02 supports a bounded snapshot, with no pagination input. This is not full-history or automatic background sync. Missing authors/media stay missing unless supported reads return them. Agent labels record supplied provenance, not proof of authorship.

The Node app writes to a local JSON file and binds to loopback only. External images are off by default; explicitly enabling them is session-only and contacts their hosts. The static preview keeps data in that browser's origin-specific storage; it is not encrypted, cross-device, or a guaranteed backup. Treat a remote hosted preview as code you must trust. Existing notes, favorites, and annotations survive re-import; restore merges rather than replacing the library.

Snapshots accept up to 10 MiB / 10,000 rows. CLI backup restore accepts up to 100 MiB / 50,000 rows; browser quotas are lower. See [format details](docs/IMPORT_FORMAT.md) and [privacy details](docs/PRIVACY.md).

Run `npm run check`, `npm test`, and `npm run build` before contributing. Build output is static files in `dist/`; building does not deploy. MIT licensed; package publishing is disabled by default.
