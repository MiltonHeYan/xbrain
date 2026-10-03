# xstash

**X のブックマークを、見返したくなるコレクションに。**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

xstash は [Milton / HeYan](https://github.com/MiltonHeYan) が始めた、**MIT ライセンスのオープンソース Agent Skill + ローカルブックマークギャラリー**です。自分の Agent でアクセスを許可した X のブックマークを読み取り、要約とタグを整理して、落ち着いた見やすいモノクロのギャラリーに保存します。

検索ボックスはひとつ。カードが並ぶ一覧と、読み取り専用の詳細画面。整理は Agent、保存と表示は xstash が担当します。モデル、モデル API キーの入力欄、X のログインページ、手動インポート画面は内蔵していません。

**推奨構成：[お使いの Agent](#step-1対応する-agent-を用意する) + [xstash Skill](#step-2xstash-skill-をインストールする) + [CoreSpeed MCP](#a推奨corespeed-mcp)。** CoreSpeed は接続済みアカウントのツールを提供し、認証から最初のブックマークの取り込みまでに必要な接続作業を減らします。公式 X API に自分で接続することもできます。以下の 2 つの方法を参照してください。

## Step 1：対応する Agent を用意する

<p>
  <a href="https://code.claude.com/docs/en/overview"><img src="docs/assets/agents/claude-code.svg" alt="Claude Code" width="32" height="32"></a>
  &nbsp;&nbsp;
  <a href="https://developers.openai.com/codex/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" alt="Codex" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://cursor.com"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" alt="Cursor" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://openclaw.ai"><img src="docs/assets/agents/openclaw.svg" alt="OpenClaw" width="32" height="32"></a>
</p>

`SKILL.md` を読み、ローカルコマンドを実行し、認証済みのデータソースにアクセスできる Agent と、**Git、Node.js 22.12+、モダンブラウザ**が必要です。ギャラリーを実行するターミナルと Agent は、同じフォルダと `127.0.0.1` のサービスにアクセスできる必要があります。

| Agent | Skill のインストール先 | 公式ドキュメント |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/xstash/` | [Skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/xstash/` | [Skills](https://developers.openai.com/codex/skills/) |
| Cursor | `~/.cursor/skills/xstash/` | [Skills](https://cursor.com/docs/skills) |
| OpenClaw | `~/.openclaw/skills/xstash/` | [Skills](https://docs.openclaw.ai/tools/skills) |

これらは Skill の読み込み機能を備えた主な Agent です。すべてのバージョン、実行環境、MCP 構成を個別に検証済みという意味ではありません。クライアント側でコマンド実行を許可する必要があります。方法 A を使う場合は、**現在使用している Agent** でリモート MCP / OAuth を設定してください。あるクライアントの接続設定が、別のクライアントに自動で引き継がれるわけではありません。他の Agent でも、同じ機能要件を満たせば、本プロジェクトの `SKILL.md` を絶対パスで直接読み込めます。

## Step 2：xstash Skill をインストールする

**`SKILL.md` だけをコピーせず、リポジトリ全体をインストールしてください。** Skill はリポジトリ内のアプリ、スクリプト、データ形式の説明を使用します。xstash は現在、直接インストールできる npm パッケージを公開していません。

以下は Codex のユーザーレベルの Skill ディレクトリを使う例です（macOS / Linux / WSL のシェル）。Claude Code、Cursor、OpenClaw の場合は、最初の行を上の表にある対応ディレクトリに変更してください。ディレクトリがすでに存在する場合は、古いインストールを確認してデータをバックアップし、上書きしないでください。

```sh
XSTASH_HOME="$HOME/.agents/skills/xstash"
git clone https://github.com/MiltonHeYan/xstash.git "$XSTASH_HOME" &&
  cd "$XSTASH_HOME" &&
  npm ci &&
  npm start
```

`npm start` はギャラリーを自動でビルドし、起動します。ターミナルに表示されたアドレスを開き、サービスを実行したままにしてください。既定のアドレスは **http://127.0.0.1:4317** です。初回のローカルライブラリは空です。クライアントの説明に従って Skill を再読み込みしてください。自動で検出されない場合は、インストール先の `SKILL.md` の絶対パスを Agent に渡してください。

Windows のネイティブ PowerShell でも、選んだ Skill ディレクトリに `git clone` し、そのディレクトリで同じ `npm ci` と `npm start` を実行できます。上記のシェル変数の構文は、そのまま貼り付けないでください。

## Step 3：X のブックマークへのアクセスを許可する

どちらか一方を選んでください。どちらもブックマークを所有するユーザーの認可が必要です。公開投稿の検索では、個人のブックマークへのアクセス権を代用できません。

### A（推奨）：CoreSpeed MCP

まず使い始めたい方や、接続をサービス側でまとめて管理したい方に適しています。xstash のために X 開発者 App を作成したり、OAuth コールバックを実装したりする必要はありません。xstash 自体は CoreSpeed や X の認証情報を受け取りません。

**1. MCP を追加する。** [CoreSpeed](https://corespeed.io) に登録またはログインし、[公式インストール手順](https://corespeed.io/SKILL.md)に従って、xstash を使うのと同じ Agent にサーバーを追加します。Claude Code では次の 1 行で追加できます。

```sh
claude mcp add corespeed https://api.corespeed.io/mcp --transport http --scope user
```

その後、Claude Code で `/mcp` を実行し、`corespeed` を選択して、ブラウザで OAuth ログインを完了します。サーバーを追加しただけでは、認可は完了していません。

Codex：

```sh
codex mcp add corespeed --url https://api.corespeed.io/mcp
codex mcp login corespeed
```

Cursor では、ユーザーレベルの `~/.cursor/mcp.json` に以下のサーバー設定を追加し、クライアントの案内に従って認証します。既存の設定は保持してください。他のクライアントでは [CoreSpeed 公式 Skill](https://corespeed.io/SKILL.md) を参照し、同じ HTTP エンドポイント `https://api.corespeed.io/mcp` を使用してください。他のクライアントの設定形式を、確認せずに流用しないでください。

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

**2. X を接続する。** [CoreSpeed Connectors](https://app.corespeed.io/connectors) を開き、読み取りたい個人の X アカウントを接続して、ブラウザでサービスの案内に従って認可を完了します。ツールを再読み込みしたら、現在のユーザー、接続アカウント、ブックマークツールの schema を Agent に確認させてください。アカウントが不明確な場合や認可が不完全な場合は、いったん停止してください。他人のアカウントに切り替えてはいけません。

**3. 最初のブックマークを Agent に整理してもらう。** 以下の依頼文のパスを、実際の絶対パスに置き換えてください。

> /absolute/path/xstash/SKILL.md を使い、現在の Agent で認可済みの CoreSpeed の個人 X アカウントからブックマークを最大 5 件読み取ってください。原文を保持し、内容に忠実な日本語の要約と 1–4 個のタグを作成して、http://127.0.0.1:4317 にインポートし、読み戻して検証してください。実際に読み取った件数、追加した件数、検証した件数、および不足しているフィールドと取得範囲を報告してください。デモデータを使わず、X を変更せず、過去のメモリを読み取らないでください。アカウントが不明確な場合や認可が不足している場合は、停止して理由を説明してください。

ギャラリーを更新すると確認できます。要約を作成するのは、選択した Agent です。xstash にモデルサービスやモデルのサブスクリプションは含まれていません。

**料金と取得範囲。** **2026-10-03** 時点で、CoreSpeed の[料金ページ](https://corespeed.io/pricing)には Free：$0、3,000 credits / 90 日、Pro：$20 / 月、10,000 credits / 月と記載されています。[課金ドキュメント](https://corespeed.io/docs/billing)の換算は 1,000 credits = $1 です。公開料金ページにはブックマークツールの明確な単価がないため、「1 回の同期は数セント」といった料金は保証しません。公開投稿の読み取り料金を、ブックマークの料金として扱うこともできません。まず少量で実行し、[Billing](https://app.corespeed.io/billing) で実際の消費量と予算を確認してください。最新の料金が適用されます。

本プロジェクトで検証した `twitter__get_my_bookmarks` の schema（2026-10-03 再確認）には `account` と `max_results` のみがあり、ページネーション用の入力はありません。レスポンスに `next_token` が含まれていても、ページネーションのパラメータを独自に追加することはできません。そのため、現在の CoreSpeed ワークフローは**ブックマークの部分的なスナップショット**であり、全履歴の同期は保証しません。不足している著者情報やメディア情報を捏造することはありません。実行のたびに、実際の schema を再確認してください。

### B：公式 X API に自分で接続する

X 開発者 App、権限、課金を直接管理したい開発者向けです。**現在、xstash に公式 X API の OAuth クライアントや取得アダプターは内蔵されていません。** この方法では、データ取得部分を自分または Agent で実装、レビュー、保守し、そのレスポンスを既存の JSON / stdin ブリッジに渡す必要があります。追加のログインボタンでそのまま使える方法ではありません。

1. **開発者アクセスを有効にする。** 自分の X アカウントで [Developer Console](https://console.x.com) を開き、現在の登録手続き、利用目的の説明、必要な規約への同意を完了します。現在のコンソールの New App の手順に従って App を作成し、名前、説明、利用目的を入力してください。コンソールで Project が求められる場合は、Project を作成または選択します。[開発者 App のドキュメント](https://docs.x.com/fundamentals/developer-apps)を参照してください。
2. **App を設定する。** OAuth 2.0 ユーザー認証を有効にし、実装に合ったアプリの種類を選び、OAuth 2.0 Client ID を保存します（confidential client では Client Secret も必要です）。正確なコールバック URL とウェブサイト URL を登録してください。コールバック処理は自分で実装する必要があり、xstash のギャラリーアドレスをそのままコールバックハンドラーとして使うことはできません。公式にはローカルコールバックで `http://127.0.0.1` を使用することが推奨されています。認可リクエストの URI は、登録した値と完全に一致する必要があります。
3. **権限と予算を確認する。** ブックマークの読み取りには `bookmark.read tweet.read users.read` が必要です。リフレッシュトークンが必要な場合にのみ `offline.access` を追加します。読み取り専用の処理に `bookmark.write` は不要です。コンソールでエンドポイントの権限を確認し、credits をチャージして予算を設定してください。X は現在、前払い credits による従量課金制です。旧 Basic / Pro の月額プラン向け手順をそのまま使わないでください。
4. **ユーザー OAuth を完了する。** [OAuth 2.0 Authorization Code + PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code) に従って実装します。ランダムな `state` と PKCE の verifier / challenge を生成し、ユーザーの認可画面に遷移させます。コールバックの `state` を検証し、返された code と verifier を使ってユーザーの access token を取得します。必要な権限を要求し、refresh token を受け取った場合にのみ、トークン更新を実装してください。認証情報は自分が管理する認証情報ストアに保管し、リポジトリ、ブックマーク JSON、公開ログに含めないでください。
5. **本人のブックマークを読み取る。** そのユーザーの token で `GET /2/users/me` を呼び出してユーザー ID を確認し、続いて `GET /2/users/{id}/bookmarks` を呼び出します。App-only bearer token では個人の非公開ブックマークを読み取れません。パスの ID は認可したユーザーと一致している必要があります。[ブックマーク取得ドキュメント](https://docs.x.com/x-api/users/get-bookmarks)に従って必要なフィールドと author / media expansions を指定します。1 ページの `max_results` は 1–100 で、次のページでは返された `next_token` を `pagination_token` として使用します。現在の[読み取りレート制限](https://docs.x.com/x-api/fundamentals/rate-limits)は、ユーザーごとに 15 分間で 180 回です。429 が返されたら `x-rate-limit-reset` に従ってください。レート制限と課金は別の制約です。API で取得できる範囲を、全履歴の完全なバックアップと表現しないでください。
6. **xstash に接続する。** 成功した X-style JSON レスポンス（`data`、任意の `includes` / `meta`）を非公開のファイルに保存するか、[標準 envelope](docs/IMPORT_FORMAT.md) に変換します。Step 2 のプロジェクトディレクトリで、以下のコマンドを実行してください。ブリッジはインポート後に読み戻して検証し、エラーレスポンスを拒否します。入力に秘密の token を含めないでください。

```sh
node scripts/agent-bridge.mjs doctor http://127.0.0.1:4317
node scripts/agent-bridge.mjs import http://127.0.0.1:4317 < /private/path/bookmarks.json
```

**公式 X API の料金。** [現在の公式料金](https://docs.x.com/x-api/getting-started/pricing)（2026-10-03 確認）はリソース単位の課金です。標準の Post read は **$0.005 / リソース**です。**Owned Reads** の条件を満たす場合、つまり認証したユーザーが開発者 App も所有している場合、本人のブックマークの読み取りは **$0.001 / リソース**です。たとえば、条件を満たすブックマークリソース 100 件だけなら、概算は **$0.10** です。これは「API リクエスト 1 回につき $0.10」という固定料金ではありません。追加のユーザー照会、その他のリソース、Agent のモデル料金は別途発生します。実際のエンドポイント、リソース分類、コンソールの請求明細で確認してください。

### どちらを選ぶ？

| 比較項目 | A：CoreSpeed MCP（推奨） | B：公式 X API を自分で実装 |
| --- | --- | --- |
| 接続手順 | MCP を追加 → ログイン → X を接続 → Skill を呼び出す | 開発者登録 → App 設定 → PKCE ユーザー認可 → 取得処理の実装 → ブリッジに接続 |
| 認証情報の管理 | CoreSpeed と Agent の認可の仕組みで管理。xstash は保存しない | App 設定とユーザー token を自分で安全に保管し、更新と失効も管理 |
| 料金 | CoreSpeed のプラン / credits。ブックマークの実際の消費量はコンソールで確認 | X の前払い credits によるリソース単位の課金。Owned Reads には適用条件あり |
| 保守 | 上流サービスへの接続は CoreSpeed が管理。再認可、利用枠、schema の変更への対応は引き続き必要 | OAuth、ページネーション、再試行、レート制限、フィールドのマッピング、API の変更を自分で保守 |
| ブックマークの取得範囲 | 現在検証済みのツールにはページネーション用の入力がなく、部分的なスナップショットのみ | 公式エンドポイントはページネーションに対応。ただし、エンドポイントの取得範囲、閲覧権限、利用枠の制約を受ける |
| xstash の対応状況 | ルートディレクトリの Skill に、このワークフローとローカルブリッジを含む | 標準 JSON / stdin インポートに対応。X OAuth / 取得アダプターは内蔵していない |

どちらの方法でも、自分の Agent / モデルサービスが別途必要です。CoreSpeed を選ぶ主な理由は、接続と保守の負担を減らせることです。未検証の低料金を保証するものではありません。

## できること

- モノクロのカードギャラリー、単一キーワード検索、読み取り専用の詳細画面。
- Agent が出典を記録した要約とタグを生成。原文と要約は別々に保持。
- 文字列 ID に基づく重複排除とマージ。スナップショットを繰り返し取り込んでも、今回含まれていない保存済み項目は削除しない。
- ローカルディスクへの保存、CLI によるバックアップのエクスポートとマージ復元。既存のメモ、お気に入り、注釈を保持。
- 既定では第三者の画像を読み込まない。詳細画面で明示的に有効にした場合、その詳細画面のセッション中だけ読み込む。

現在、自動バックグラウンド同期、全履歴の取得、セマンティック検索、デバイス間同期、マルチユーザーシステム、X への書き込み、動画プレーヤー、手動インポート / 編集 UI は提供していません。まだ初期段階のプロジェクトです。制限の詳細は[データ形式](docs/IMPORT_FORMAT.md)と[プライバシーに関する説明](docs/PRIVACY.md)を参照してください。

## ローカルデータ、バックアップ、アップグレード

Node サービスは `127.0.0.1` でのみ待ち受け、既定ではプロジェクト内の `data/bookmarks.json` に保存します。本番環境向けのログイン認証はありません。公開トンネルやリバースプロキシを使って個人のライブラリを公開しないでください。ブックマークはローカルに保存されますが、Agent / CoreSpeed で処理する際には各サービスのデータ処理に関する規約が適用されます。「ローカルファースト」は、処理全体がオフラインであることを意味しません。

プロジェクトディレクトリで実行してください。

```sh
node cli.mjs stats
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
node cli.mjs --help
```

`export` は既存のファイルを上書きしません。`restore` は既存データを消去して置き換えるのではなく、マージします。通常のインポートは 1 バッチあたり最大 10 MiB / 10,000 件、ローカルライブラリ全体とバックアップからの復元は最大 100 MiB / 50,000 件です。バックアップと完全に一致するコピーが必要な場合は、新しいライブラリのパスに復元してください。CLI では `--store`、サービスでは `BOOKMARK_STORE` で非公開ファイルを指定できます。新規インストール後やソース更新後に CLI / ブリッジを単独で実行する場合は、先に `npm run build` を実行してください。

旧名称の Commonplace からアップグレードする場合は、まず古い `data/bookmarks.json` をバックアップし、そのコピーで検証してください。v1 データ形式と `commonplace.library.v1` のブラウザストレージキーは互換性を維持しています。`BOOKMARK_STORE=/绝对路径/旧库.json npm start` で元のライブラリを指定できます（パスは実際の絶対パスに置き換えてください）。新しいディレクトリの空のライブラリで上書きしないでください。

静的ビルドの `dist/` には、非公開の `data/` も Node API も含まれていません。静的プレビューは架空のサンプルを表示するもので、実際のローカルブックマークライブラリの代わりにはなりません。既存のブラウザライブラリは、引き続きドメインごとに独立して保存されます。外部画像を有効にすると画像ホストにネットワークリクエストが送信され、原文のリンクをクリックすると X にアクセスします。

## 開発とコントリビューション

```sh
npm ci
npm run check
npm test
npm run build
```

技術スタックは strict モードの TypeScript、React、Vite、Node HTTP サーバーです。追加のデータベースはありません。[アーキテクチャ](docs/ARCHITECTURE.md)、[コントリビューションガイド](CONTRIBUTING.md)、[テスト](docs/TESTING.md)、[Agent ワークフロー](docs/SKILL.md)、[独立した受け入れテスト](docs/CLEAN_AGENT_ACCEPTANCE.md)を参照してください。テスト fixtures はすべて架空のデータであり、テストに実際の X や CoreSpeed の認証情報は不要です。

## ライセンスと謝辞

[MIT License](LICENSE)。[Milton / HeYan](https://github.com/MiltonHeYan) が始めたプロジェクトです。コントリビューションを歓迎します。MIT ライセンスの対象は本プロジェクトのコードと独自に作成したサンプルであり、第三者の投稿、メディア、商標の利用権を付与するものではありません。

xstash は独立したオープンソースプロジェクトです。Claude、Codex、Cursor、OpenClaw、X、CoreSpeed の名称とロゴは、それぞれの権利者に帰属します。[ロゴの出典](docs/assets/agents/README.md)。表示は対応ツールを識別するためのものであり、公式な提携、認証、推奨を意味しません。サービスの料金、権限、規約は、各サービスの最新の説明に従ってください。
