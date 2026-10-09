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

## Agent と X アカウントへのアクセス

Agent と X への接続方法は別々に選べます。Claude Code、Codex、Muse、OpenClaw、Hermes など、ローカルコマンドと画像理解に対応する Agent を使えます。ただし、非公開のブックマークを読むには、本人が許可したデータソースが必要です。公開 X 検索だけではアクセスできません。

[Grok Bot の X プラグイン](https://docs.x.ai/grok-bot/tag-on-x)の公式文書にはブックマーク機能があります。ただし、Xbrain には Grok Bot 用アダプターがなく、そこからの一連の取り込みも未検証です。他の Agent を使う場合は、次の接続方法を選べます。

- **公式 X API：**[開発者アカウントとアプリ](https://docs.x.com/x-api/getting-started/getting-access)を登録し、[X の現行料金](https://docs.x.com/x-api/getting-started/pricing)に従って API 利用分を購入して、ユーザー OAuth で自分のアカウントを認可します。読み取りには `bookmark.read` とエンドポイントが要求する他のスコープが必要です。Xbrain は X OAuth クライアントや直接 API アダプターを同梱していないため、レビュー済みの[ソースアダプター](docs/SYNC_BOOKMARKS.md)が必要です。
- **任意の CoreSpeed MCP：**[CoreSpeed](https://corespeed.io) が接続設定を担当します。Agent に `set up https://corespeed.io/SKILL.md` を渡し、個人の X アカウントを接続して、同梱の [CoreSpeed ソースアダプター](docs/CORESPEED_SOURCE.md)を使います。現状は一回につき最大 100 件の部分的な取得で、続きのページは取得できず、全履歴の取り込みは保証しません。従量課金の呼び出しには CoreSpeed credits を使います。

認証情報はリポジトリの外に保存してください。[X のブックマーク権限](https://docs.x.com/x-api/posts/bookmarks/introduction)と [OAuth スコープ](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)も参照してください。

[導入と使い方](SKILL.md) · [デザインと関係図](docs/DESIGN.md) · [X 入力](docs/SYNC_BOOKMARKS.md) · [記憶](docs/MEMORY.md) · [貢献](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 既存の xstash データパスとコマンドは互換性を維持します。
