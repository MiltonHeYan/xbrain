# xrecall

**把零散的设计收藏，变成 Agent 找得到、说得清的上下文。**

给 Agent 这一行：

```text
阅读 https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md，帮我安装 xrecall，并整理我授权的设计收藏以便检索。
```

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## “图我收藏了，但说不出这是什么风格。”

Agent 查看你收藏的 UI 或室内设计原图，记录可见特征，给出有证据的风格假设。做设计时，找回相关原图、比较共同点，由你确认方向后转成设计要求。本地关系图展示这些关联。

收藏不等于偏好；风格标签需你确认。看不到的图片保持未分析，不猜。

## 需要什么

Git、Node.js 22.12+，以及能运行本地命令和看图的 Agent。现有 connector 负责获取授权收藏；xrecall 负责整理与检索。记忆默认本地，外部后端由你选择。 [CoreSpeed](https://corespeed.io) — 可选连接方案。

[安装与使用](SKILL.md) · [设计流程与关系图](docs/DESIGN.md) · [X 输入](docs/SYNC_BOOKMARKS.md) · [记忆](docs/MEMORY.md) · [贡献](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 原 xstash 数据路径和命令保持兼容。
