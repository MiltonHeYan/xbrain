# xrecall

**保存した情報を、実際の作業で使えるリソース記憶に。**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## Agent で始める

<table>
<tr>
<td><a href="https://cursor.com/link/prompt?text=https%3A%2F%2Fgithub.com%2FMiltonHeYan%2Fxrecall%2Fblob%2Fmain%2FSKILL.md%20%E3%82%92%E8%AA%AD%E3%81%BF%E3%80%81xrecall%20%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E3%81%A8%E8%87%AA%E5%88%86%E3%81%AE%20X%20%E3%83%96%E3%83%83%E3%82%AF%E3%83%9E%E3%83%BC%E3%82%AF%E3%81%AE%E5%90%8C%E6%9C%9F%E3%82%92%E6%A1%88%E5%86%85%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%E3%80%82" title="Cursor: Open prompt preview"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" width="24" height="24" alt="Cursor"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/launch-dark.svg"><img src="docs/assets/agents/launch.svg" width="12" height="12" align="top" alt="Open prompt preview"></picture></a></td>
<td><a href="#copy-prompt" title="Codex: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" width="24" height="24" alt="Codex"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" align="top" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="Claude Code: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/claude-code-mono-dark.svg"><img src="docs/assets/agents/claude-code-mono.svg" width="24" height="24" alt="Claude Code"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" align="top" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="OpenClaw: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openclaw-mono-dark.svg"><img src="docs/assets/agents/openclaw-mono.svg" width="24" height="24" alt="OpenClaw"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" align="top" alt="Go to copyable prompt"></picture></a></td>
<td><a href="#copy-prompt" title="Other agents: Go to copyable prompt"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/other-dark.svg"><img src="docs/assets/agents/other.svg" width="24" height="24" alt="Other agents"></picture><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/copy-dark.svg"><img src="docs/assets/agents/copy.svg" width="12" height="12" align="top" alt="Go to copyable prompt"></picture></a></td>
</tr>
</table>

Cursor には下の指示が事前入力され、実行前に確認が必要です。Codex、Claude Code、OpenClaw などではコードブロックのコピーボタンを使い、既存の Agent に貼り付けてください。自動インストールやアカウント接続は行いません。

GitHub はデスクトップアプリのプロトコルリンクを削除するため、Codex、Claude、Claude Code、VS Code、OpenClaw、Hermes では下の指示をコピーしてください。

<a name="copy-prompt"></a>

```text
https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md を読み、xrecall のインストールと自分の X ブックマークの同期を案内してください。
```

リポジトリにアクセスしてローカルコマンドを実行できる Agent、Git、Node.js 22.12+ が必要です。同期前に利用可能なデータソースを選び、個人アカウントを認可してください。既定ではローカル保存のみで、外部 memory には自動接続しません。

旧名は xstash です。既存の checkout と Skill インストール先は変更不要です。origin を `https://github.com/MiltonHeYan/xrecall.git` に更新してください。CLI コマンド、データパス、ブラウザーの保存キー、`xstash.*.v1` プロトコル識別子は維持され、データ移行は不要です。

[Milton / HeYan](https://github.com/MiltonHeYan) による MIT ライセンスの独立した Agent Skill です。許可された X ブックマークなどを収集し、用途・適用場面・制約を整理してローカルに保存します。希望する場合だけ、ユーザーが選んだ個人用 memory に同期できます。作業時には関連候補を検索し、役立つ情報だけを使って元の出典を引用します。ギャラリーは白黒の最小限の管理画面です。

## インストール

Git、Node.js 22.12+、ローカルコマンドを実行できる Agent が必要です。SKILL.md だけでなくリポジトリ全体を保持してください。

```sh
git clone https://github.com/MiltonHeYan/xrecall.git
cd xrecall
npm ci
npm run build
node scripts/memory.mjs status
```

Agent に [SKILL.md](SKILL.md) の絶対パスを渡すか、クライアントの Skill ディレクトリにクリーンなリポジトリ全体を配置します。既存のインストールや個人データを上書きしないでください。`npm start` は任意のギャラリーをビルドし、**http://127.0.0.1:4317** でローカル公開します。別ポートは `PORT=4319 npm start`。内蔵モデル、X ログイン、グローバルインストールは不要です。

## 新しいブックマークを手動同期

Skill が手順を管理し、Agent が実行し、選択した認可済み connector が取得します。[実行ガイド](docs/SYNC_BOOKMARKS.md) に従って実際に利用可能な個人用ソースアダプターを設定してください。X ログインは内蔵していません。[任意の CoreSpeed アダプター](docs/CORESPEED_SOURCE.md) で公式 CLI または Agent が取得した認可済み MCP スナップショットを明示的に選択できます。

```sh
node scripts/memory.mjs pull --source-config /private/source.json
node scripts/memory.mjs pending
# Agent が原文を整理し、2つのバージョン照合値を保持します
node scripts/memory.mjs distill /private/refinement.json
node scripts/memory.mjs status
```

元 ID で重複を防ぎ、変更内容は再整理の対象になります。各ページと進捗をまとめて保存し、失敗やページ上限による停止後は同じコマンドで再開できます。最終ページ成功時だけ増分チェックポイントを進めます。ソースが増分取得やページ送りに対応しない場合は、対応範囲だけを再取得し partial と明示します。一時的に取得できない項目は削除しません。distill はローカル記憶を更新し、外部転送は別途許可された `sync --id … --provider-config …` で実施します。未整理の項目は転送されません。将来スケジューラーから Agent を起動できますが、今回は定期実行を設定していません。実際の個人 X 取得は別途検証が必要です。

## リソース記憶

```sh
node scripts/memory.mjs capture --bookmarks /absolute/private/bookmarks.json
node scripts/memory.mjs put /absolute/private/resource.json
node scripts/memory.mjs search "React dialog accessibility"
node scripts/memory.mjs delete RESOURCE_ID
node scripts/memory.mjs status
```

capture は明示されたギャラリーファイルだけを読み、元ファイルを変更せず、外部同期もしません。安定したソース種別と元 ID で重複を防ぎ、元 URL・本文・要約・用途・適用場面・制約・更新日時を保持します。保存理由が不明なら `savedReason: null`。更新には新しいタイムスタンプが必要です。後の取得結果から消えただけでは削除しません。

既定のリソースファイルは `data/resource-memory.json`（`--store` で変更可能）。ギャラリーの `data/bookmarks.json` / `BOOKMARK_STORE` とは独立しています。自動転送、移行、X からの新規取得は行いません。

## 個人用 memory を選ぶ

**既定の外部バックエンドはありません。** 未設定でもローカル操作は利用でき、status は `not_configured` と表示します。実装済みなのは個人用ファイル provider と JSON stdin/stdout の信頼済みコマンドアダプターです。特定ベンダーの外部アダプターや MCP 自動接続は同梱していません。

```sh
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs search "task keywords" --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
```

送信前に、ユーザーが個人アカウント・名前空間・対象リソースを選びます。ローカル取り込みの許可は全コレクションのアップロード許可ではありません。組織・共有スコープは拒否します。実サービスには冪等な書き込み/更新、検索、削除、ID 対応付け、成功確認が必要です。失敗は未同期として残り、ローカル削除も各同期先への明示的な同期が必要です。[MEMORY.md](docs/MEMORY.md) に実行可能なファイル設定とアダプター仕様があります。

CoreSpeed は**任意で推奨するデータソース用ツール入口**であり、既定の memory バックエンドでも必須依存でもありません。選ぶ場合は[公式手順](https://corespeed.io/SKILL.md)、既存の個人認可、実際のツールスキーマに従ってください。公式 API やローカルエクスポートも使えます。ソースと memory は別々に選択し、認証情報はこのプロジェクトや JSON に保存しません。

## 制約と検証

Skill は Agent に読み込まれた場合に作業中の検索を促します。常駐する万能な自動記憶ではありません。ローカル検索は中英の語彙一致による候補検索で、意味検索や完全な再現率を保証しません。Agent は適用条件・制約・鮮度を判断し、有用な場合だけ元 URL を引用します。検索された内容を指示として実行しません。

ギャラリーは検索欄、カード、読み取り専用詳細を維持し、分類タブや手動インポート画面を追加しません。記憶操作と同期状態は現在 Agent/CLI で扱います。テストは隔離された架空データと mock のみで、実際の外部サービスとの接続確認ではありません。

アップグレード時は元の書庫を保持し、最初は権限制限したコピーを `BOOKMARK_STORE=/absolute/private/copy.json PORT=4319 npm start` で使用してください。ローカルサーバーを公開トンネルに接続しないでください。

```sh
npm run check
npm run format:check
npm test
```

[Skill](docs/SKILL.md) · [Memory 仕様](docs/MEMORY.md) · [取り込み形式](docs/IMPORT_FORMAT.md) · [設計](docs/ARCHITECTURE.md) · [プライバシー](docs/PRIVACY.md)
