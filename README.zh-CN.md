```text
阅读 https://github.com/MiltonHeYan/xbrain/blob/main/SKILL.md，帮我安装 Xbrain，并整理我授权的设计收藏以便检索。
```

# Xbrain

**把零散的设计收藏，变成 Agent 找得到、说得清的上下文。**

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## “图我收藏了，但说不出这是什么风格。”

Agent 查看你收藏的 UI 或室内设计原图，记录可见特征，给出有证据的风格假设。做设计时，找回相关原图、比较共同点，由你确认方向后转成设计要求。本地关系图展示这些关联。

收藏不等于偏好；风格标签需你确认。看不到的图片保持未分析，不猜。

![Xbrain 硬件参考关系图与原帖证据](docs/assets/xbrain-graph.png)

## 需要什么

Git、Node.js 22.12+，以及能运行本地命令和看图的 Agent。现有 connector 负责获取授权收藏；Xbrain 负责整理与检索。记忆默认本地，外部后端由你选择。 [CoreSpeed](https://corespeed.io) — 可选连接方案。

## Agent 与 X 账号权限

选择 Agent 和选择 X 接入方式是两件事。Claude Code、Codex、Muse、OpenClaw 或 Hermes，只要支持本地命令和看图，就可以担任宿主；读取私人收藏仍需你授权的数据来源。公开 X 搜索本身无法提供这项权限。

[Grok Bot 的 X 插件](https://docs.x.ai/grok-bot/tag-on-x)官方文档列出了收藏功能，但 Xbrain 尚无 Grok Bot 适配器，也未验证经它导入的完整流程。如果你想使用其他 Agent，可以选择：

- **官方 X API：**申请[开发者账号并创建应用](https://docs.x.com/x-api/getting-started/getting-access)，按 [X 当前价格](https://docs.x.com/x-api/getting-started/pricing)购买 API 用量，通过用户 OAuth 授权自己的账号。读取收藏需要 `bookmark.read` 及端点要求的其他权限。Xbrain 未内置 X OAuth 客户端或直接 API 适配器；这条路径需要经过审查的[来源适配器](docs/SYNC_BOOKMARKS.md)。
- **可选 CoreSpeed MCP：**由 [CoreSpeed](https://corespeed.io)处理连接配置。把 `set up https://corespeed.io/SKILL.md` 发给 Agent，再连接你的个人 X 账号，使用仓库已有的 [CoreSpeed 来源适配器](docs/CORESPEED_SOURCE.md)。目前每次最多导入 100 条收藏的部分窗口，不支持翻页，不能保证覆盖全部历史。计费调用消耗 CoreSpeed credits。

凭据保存在仓库之外。详见 [X 收藏权限](https://docs.x.com/x-api/posts/bookmarks/introduction)和 [OAuth 权限范围](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)。

[安装与使用](SKILL.md) · [设计流程与关系图](docs/DESIGN.md) · [X 输入](docs/SYNC_BOOKMARKS.md) · [记忆](docs/MEMORY.md) · [贡献](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 原 xstash 数据路径和命令保持兼容。
