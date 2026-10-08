```text
https://github.com/MiltonHeYan/xbrain/blob/main/SKILL.md を読み、Xbrain の導入と、許可したデザイン資料の整理・検索を手伝ってください。
```

# Xbrain

**散らばったデザイン参考画像を、Agent が探して説明できる文脈に。**

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Xbrain コンセプト映像：保存した資料、Gallery、Brain](docs/assets/xbrain-demo-v6.jpg)](https://github.com/corespeed-io/xbrain/releases/download/demo-video-v6/Xbrain-concept-v6.mp4)

[▶ 34 秒のコンセプト映像を開く（MP4）](https://github.com/corespeed-io/xbrain/releases/download/demo-video-v6/Xbrain-concept-v6.mp4)

## 「画像は保存したけれど、スタイルの名前がわからない。」

Agent が保存済みの UI やインテリア画像を見て、視覚的な特徴と根拠のあるスタイル候補を記録します。デザイン時には原画像を検索し、共通点を比較。あなたが方向性を確認してから要件にします。ローカルの関係図でつながりも確認できます。

保存は好みの確定ではありません。スタイルは確認するまで仮説です。見られない画像は未分析のままにします。

![Xbrain のハードウェア参考資料グラフと出典](docs/assets/xbrain-graph.png)

## 必要なもの

Git、Node.js 22.12+、ローカルコマンドと画像理解に対応した Agent。既存の connector が許可済み資料を取得し、Xbrain が整理・検索します。記憶はローカルで使え、外部バックエンドは自分で選べます。 [CoreSpeed](https://corespeed.io) — 任意の接続手段。

[導入と使い方](SKILL.md) · [デザインと関係図](docs/DESIGN.md) · [X 入力](docs/SYNC_BOOKMARKS.md) · [記憶](docs/MEMORY.md) · [貢献](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 既存の xstash データパスとコマンドは互換性を維持します。
