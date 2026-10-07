# xrecall

**把收藏变成做事时用得上的资源记忆。**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## 用你的 Agent 开始

<table>
<tr>
<td><a href="https://cursor.com/link/prompt?text=%E8%AF%B7%E9%98%85%E8%AF%BB%20https%3A%2F%2Fgithub.com%2FMiltonHeYan%2Fxrecall%2Fblob%2Fmain%2FSKILL.md%20%EF%BC%8C%E5%B8%AE%E6%88%91%E5%AE%89%E8%A3%85%20xrecall%EF%BC%8C%E5%B9%B6%E5%BC%95%E5%AF%BC%E6%88%91%E5%90%8C%E6%AD%A5%E8%87%AA%E5%B7%B1%E7%9A%84%20X%20%E6%94%B6%E8%97%8F%E3%80%82" title="Cursor: Open prompt preview"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" width="24" height="24" alt="Cursor"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/launch-dark.svg"><img src="docs/assets/agents/launch.svg" width="12" height="12" alt="Open prompt preview"></picture></a></td>
<td><a href="#copy-prompt" title="Codex: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" width="24" height="24" alt="Codex"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="Claude Code: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/claude-code-mono-dark.svg"><img src="docs/assets/agents/claude-code-mono.svg" width="24" height="24" alt="Claude Code"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="OpenClaw: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openclaw-mono-dark.svg"><img src="docs/assets/agents/openclaw-mono.svg" width="24" height="24" alt="OpenClaw"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="Other agents: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/other-dark.svg"><img src="docs/assets/agents/other.svg" width="24" height="24" alt="Other agents"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" alt="Go to copyable prompt"></picture></a></td>
</tr>
</table>

Cursor 会预填下方提示词，需你确认后才执行。Codex、Claude Code、OpenClaw 等请用代码块右上角的复制按钮，再粘贴到已有 Agent；这些入口不会自动安装或连接账号。

GitHub 会移除桌面应用协议链接，因此 Codex、Claude、Claude Code、VS Code、OpenClaw 和 Hermes 使用下方复制指令。

<a name="copy-prompt"></a>

```text
请阅读 https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md ，帮我安装 xrecall，并引导我同步自己的 X 收藏。
```

需要能访问仓库并执行本地命令的 Agent，以及 Git、Node.js 22.12+。同步前需选择可用的数据源并授权个人账号；默认只保存到本地，不自动连接远端 memory。

原名 xstash。已有 checkout 无需改目录或搬迁数据；只需将 origin 更新为 `https://github.com/MiltonHeYan/xrecall.git`。现有 CLI 命令、数据路径、浏览器存储键和 `xstash.*.v1` 协议标识保持兼容；已有 Skill 安装目录也可继续使用。

xrecall 是 [Milton / HeYan](https://github.com/MiltonHeYan) 发起的 MIT 开源独立 Agent Skill。它帮助你的 Agent 采集授权范围内的 X 收藏等资源，提炼用途、适用情境与限制，保存到本地资源记忆；也可显式同步到你选择的个人 memory。做实际任务时，Agent 检索相关资源、判断是否适用，再使用并引用原始来源。

**你的 Agent + 你选择的数据源 + 你选择的个人 memory。没有默认远端后端。** 不选择 memory 服务也能本地保存、搜索、更新和删除；未同步状态会明确返回。图库保留极简黑白的搜索框、卡片墙和只读详情，作为本地管理视图。

## 安装与本地运行

需要 Git、Node.js 22.12+ 和能运行本地命令的 Agent。克隆完整仓库，不能只复制 `SKILL.md`：

```sh
git clone https://github.com/MiltonHeYan/xrecall.git
cd xrecall
npm ci
npm run build
node scripts/memory.mjs status
```

把根目录 [`SKILL.md`](SKILL.md) 的绝对路径交给 Agent。也可按客户端规则把整个干净仓库安装到 Skill 目录（如 Codex 的 `~/.agents/skills/xrecall/`）；不要覆盖已有安装或复制私人 `data/`。Agent、终端与文件必须处于可互相访问的环境。此代码未发布为 npm 包。

查看图库：

```sh
npm start
```

默认打开 **http://127.0.0.1:4317**，仅监听本机。`npm start` 自动构建；已有服务占用端口时可用 `PORT=4319 npm start`。没有内置 X 登录、模型 API Key、自动后台采集或公开托管服务。

## 手动“同步我的新收藏”

Skill 组织流程，Agent 执行，用户选择的 connector 负责真实拉取。先按 [运行文档](docs/SYNC_BOOKMARKS.md) 配好实际可用的个人来源适配器；项目未内置 X 登录；可显式选择[可选 CoreSpeed 来源适配器](docs/CORESPEED_SOURCE.md)，使用官方 CLI 或由 Agent 交接的成功 MCP 快照。

```sh
node scripts/memory.mjs pull --source-config /private/source.json
node scripts/memory.mjs pending
# Agent 根据 pending 中的原文整理，并保留两个版本校验值
node scripts/memory.mjs distill /private/refinement.json
node scripts/memory.mjs status
```

新收藏按来源 ID 去重，内容变化重新进入整理队列。每页提交保存进度，失败或达到页数限额后重跑同一命令可恢复；只有最后一页成功才推进增量检查点。来源不支持增量或分页时，只重扫实际支持的范围并明确报告 partial，不猜参数。暂时未拉到的条目不会被删除。

`distill` 完成本地记忆更新；需要上传时，再对已授权记录执行 `sync --id … --provider-config …`。待整理记录会阻止外部同步。定时器将来可以触发同一 Agent 流程，但本次不安装或启用任何定时任务。真实个人 X 导入仍需单独验证。

## 把资源保存为记忆

资源字段包含原始来源与稳定来源 ID、原文、摘要、用途、适用情境、限制、更新时间和收藏原因。**未知收藏原因保持 `null`，不编造。** 同一来源 ID 重复写入不会新增；修改需更晚的版本时间。

```sh
# 只读取你明确选定的已有图库文件，写入独立本地资源库；不会远端同步
node scripts/memory.mjs capture --bookmarks /absolute/private/bookmarks.json
# Agent 将完整资源 JSON 通过 stdin 交给 put；也可指定私人文件
node scripts/memory.mjs put /absolute/private/resource.json
node scripts/memory.mjs search "React dialog accessibility"
node scripts/memory.mjs delete RESOURCE_ID
node scripts/memory.mjs status
```

默认资源库是项目 `data/resource-memory.json`；`--store` 可选择其他私有文件。图库仍使用独立的 `data/bookmarks.json`，`BOOKMARK_STORE` 只影响图库。capture 不改图库、不自动读取运行中的服务、不导入演示数据；原始资源缺失不代表删除。

交给 Agent 的示例：

> 使用 /绝对路径/xrecall/SKILL.md，整理我明确选择的资源。先保存本地，基于实际来源提炼用途、适用情境和限制，未知收藏原因不要猜。没有选定个人 memory 服务之前不要远端同步。完成任务时先检索可能相关的资源，适用才使用并引用来源，没有匹配就继续任务。

## 选择 memory，而不是被绑定

当前实现：本地资源库、可用的个人文件 provider，以及 JSON stdin/stdout 命令适配协议。**尚未内置任何远端厂商适配器或 MCP 自动连接。** `status` 未提供配置时返回 `not_configured`；`sync` 会清楚提示未同步，不会选用已有连接代替用户选择。

```sh
# provider.json 必须是你选择的个人目标与已审查适配器配置
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs search "任务关键词" --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
```

对接真实 memory 服务，需要其实际接口支持：按稳定 ID 幂等写入/更新、检索、删除、个人隔离与成功确认。若服务自行分配 ID，适配器负责保存映射。只有确认成功的版本才记为已同步，失败保留待同步；本地删除需再同步到每个已使用目标。授权本地导入不等于授权把整库上传，组织共享 memory 不在当前范围。

完整配置、字段和协议见 **[资源记忆指南](docs/MEMORY.md)**。它是扩展约定，不代表任意 memory 服务已经可用。

## 数据源可选推荐

可以使用你已授权的数据源工具、官方 API 或本地导出文件。**CoreSpeed 是可选推荐的数据源工具入口，不是 xrecall 的默认 memory 后端，也不是必需依赖。** 如你选择它，可按 [官方说明](https://corespeed.io/SKILL.md) 在当前 Agent 配置并连接个人 X 账号；现有连接可复用。每次按实际 schema 与授权范围读取，不猜测分页参数，不把部分快照称作完整历史。

官方 X API 路径需由你的客户端处理用户 OAuth、权限和计费；项目不保存 X/API 凭据，不代替客户端登录。采集与 memory 服务可以分别选择，与图库独立。

## 实际能力与边界

- Skill 在被 Agent 加载/选择后，引导任务规划和执行时检索；不是后台万能自动记忆，不能保证未加载它的 Agent 自动想起资源。
- 本地检索是中英文词法候选匹配，返回适用情境、限制和来源。Agent 仍需判断相关性与时效；不相关就不引用，不保证语义检索或穷尽召回。
- 不自动上传私人收藏，不写组织共享 memory，不创建凭据，不改动 X 收藏。来源文本和 memory 内容均按不可信数据处理。
- 本地书签与资源数据互不迁移覆盖。文件权限、原子写入、锁和失败保护保留；外部图片仍需会话授权。
- 黑白图库只供浏览管理，未重新加入分类 tabs 或复杂手动导入 UI。资源管理通过 Agent/CLI 完成，图库当前不展示 memory 同步状态。

从旧版升级：保留原 `data/bookmarks.json`。首次验收使用权限受限的备份副本，再用 `BOOKMARK_STORE=/绝对路径/副本.json PORT=4319 npm start` 指定；不要迁库、覆盖、重导或混入虚构数据。不要把本机服务通过隧道公开。

## 开发与验证

```sh
npm run check
npm run format:check
npm test
```

测试只使用隔离虚构数据和 mock provider，覆盖写入去重、更新、删除传播、失败重试、检索相关性、来源引用和原图库不变；不代表真实远端 memory 已对接。

[Skill 工作流](docs/SKILL.md) · [Memory 协议](docs/MEMORY.md) · [图库数据格式](docs/IMPORT_FORMAT.md) · [架构](docs/ARCHITECTURE.md) · [隐私](docs/PRIVACY.md) · [贡献](CONTRIBUTING.md)
