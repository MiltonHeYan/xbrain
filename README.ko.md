# xstash

**X 북마크를, 다시 보고 싶은 컬렉션으로.**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

xstash는 [Milton / HeYan](https://github.com/MiltonHeYan)이 시작한 **MIT 라이선스 오픈 소스 Agent Skill + 로컬 북마크 갤러리**입니다. 자신의 Agent로 접근을 허용한 X 북마크를 읽고, 요약과 태그를 정리해 차분하고 명료한 흑백 갤러리에 보관합니다.

검색창 하나, 카드로 구성된 목록, 읽기 전용 상세 화면. 정리는 Agent가, 저장과 표시는 xstash가 맡습니다. 내장 모델, 모델 API 키 입력란, X 로그인 페이지, 수동 가져오기 화면은 없습니다.

**권장 구성: [사용 중인 Agent](#step-1-호환되는-agent-준비) + [xstash Skill](#step-2-xstash-skill-설치) + [CoreSpeed MCP](#a권장-corespeed-mcp).** CoreSpeed는 연결된 계정의 도구를 제공해, 권한 승인부터 첫 북마크를 가져오기까지 필요한 연결 작업을 줄여 줍니다. 공식 X API에 직접 연결할 수도 있습니다. 아래 두 가지 방법을 참고하세요.

## Step 1: 호환되는 Agent 준비

<p>
  <a href="https://code.claude.com/docs/en/overview"><img src="docs/assets/agents/claude-code.svg" alt="Claude Code" width="32" height="32"></a>
  &nbsp;&nbsp;
  <a href="https://developers.openai.com/codex/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" alt="Codex" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://cursor.com"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" alt="Cursor" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://openclaw.ai"><img src="docs/assets/agents/openclaw.svg" alt="OpenClaw" width="32" height="32"></a>
</p>

`SKILL.md`를 읽고, 로컬 명령을 실행하고, 접근 권한을 받은 데이터 소스에 연결할 수 있는 Agent와 **Git, Node.js 22.12+, 최신 브라우저**가 필요합니다. 갤러리를 실행하는 터미널과 Agent는 같은 폴더와 `127.0.0.1` 서비스에 접근할 수 있어야 합니다.

| Agent | Skill 설치 경로 | 공식 문서 |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/xstash/` | [Skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/xstash/` | [Skills](https://developers.openai.com/codex/skills/) |
| Cursor | `~/.cursor/skills/xstash/` | [Skills](https://cursor.com/docs/skills) |
| OpenClaw | `~/.openclaw/skills/xstash/` | [Skills](https://docs.openclaw.ai/tools/skills) |

위 목록은 Skill 로딩 기능을 제공하는 주요 Agent입니다. 모든 버전, 실행 환경, MCP 구성을 하나씩 검증했다는 뜻은 아닙니다. 클라이언트에서 명령 실행을 허용해야 합니다. 방법 A를 사용할 때는 **현재 사용하는 Agent**에서 원격 MCP / OAuth도 설정해야 합니다. 한 클라이언트의 연결 설정이 다른 클라이언트에 자동으로 이어지지는 않습니다. 다른 Agent도 같은 기능 요건을 충족한다면 이 프로젝트의 `SKILL.md`를 절대 경로로 직접 읽을 수 있습니다.

## Step 2: xstash Skill 설치

**`SKILL.md`만 복사하지 말고 저장소 전체를 설치하세요.** Skill은 저장소 안의 앱, 스크립트, 데이터 형식 문서를 사용합니다. xstash는 현재 바로 설치할 수 있는 npm 패키지를 배포하지 않습니다.

아래는 Codex의 사용자 수준 Skill 디렉터리를 사용하는 예시입니다(macOS / Linux / WSL 셸). Claude Code, Cursor, OpenClaw 사용자는 먼저 첫 줄을 위 표의 해당 경로로 바꾸세요. 디렉터리가 이미 있다면 기존 설치를 확인하고 데이터를 백업한 뒤 진행하세요. 덮어쓰면 안 됩니다.

```sh
XSTASH_HOME="$HOME/.agents/skills/xstash"
git clone https://github.com/MiltonHeYan/xstash.git "$XSTASH_HOME" &&
  cd "$XSTASH_HOME" &&
  npm ci &&
  npm start
```

`npm start`는 갤러리를 자동으로 빌드하고 실행합니다. 터미널에 표시된 주소를 열고 서비스를 실행 상태로 유지하세요. 기본 주소는 **http://127.0.0.1:4317**입니다. 처음에는 로컬 라이브러리가 비어 있습니다. 클라이언트 안내에 따라 Skill을 다시 로드하세요. 자동으로 발견되지 않으면 설치 디렉터리에 있는 `SKILL.md`의 절대 경로를 Agent에 알려 주세요.

Windows 기본 PowerShell에서도 선택한 Skill 디렉터리에 `git clone`한 뒤, 해당 디렉터리에서 같은 `npm ci`, `npm start` 명령을 실행할 수 있습니다. 위의 셸 변수 문법을 그대로 붙여 넣지는 마세요.

## Step 3: X 북마크 접근 권한 승인

두 방법 중 하나를 선택하세요. 둘 다 북마크 소유자의 권한 승인이 필요합니다. 공개 게시물 검색으로 개인 북마크 접근 권한을 대신할 수는 없습니다.

### A(권장): CoreSpeed MCP

먼저 사용을 시작하고, 연결 관리는 서비스에 맡기고 싶은 사용자에게 적합합니다. xstash를 위해 X 개발자 App을 직접 만들거나 OAuth 콜백을 구현할 필요가 없습니다. xstash 자체는 CoreSpeed나 X 인증 정보를 받지 않습니다.

**1. MCP 추가.** [CoreSpeed](https://corespeed.io)에 가입하거나 로그인한 뒤, [공식 설치 안내](https://corespeed.io/SKILL.md)에 따라 xstash를 사용할 동일한 Agent에 서버를 추가하세요. Claude Code에서는 다음 한 줄로 추가할 수 있습니다.

```sh
claude mcp add corespeed https://api.corespeed.io/mcp --transport http --scope user
```

이후 Claude Code에서 `/mcp`를 실행하고 `corespeed`를 선택한 다음, 브라우저에서 OAuth 로그인을 완료하세요. 서버를 추가하는 것만으로 권한 승인이 끝나지는 않습니다.

Codex:

```sh
codex mcp add corespeed --url https://api.corespeed.io/mcp
codex mcp login corespeed
```

Cursor에서는 사용자 수준의 `~/.cursor/mcp.json`에 아래 서버 설정을 병합한 뒤, 클라이언트 안내에 따라 인증하세요. 기존 설정은 유지해야 합니다. 다른 클라이언트는 [CoreSpeed 공식 Skill](https://corespeed.io/SKILL.md)을 참고하고, 동일한 HTTP 엔드포인트 `https://api.corespeed.io/mcp`를 사용하세요. 다른 클라이언트의 설정 형식을 확인 없이 적용하지 마세요.

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

**2. X 연결.** [CoreSpeed Connectors](https://app.corespeed.io/connectors)를 열고, 북마크를 읽을 자신의 개인 X 계정을 연결한 다음, 브라우저에서 서비스 안내에 따라 권한 승인을 완료하세요. 도구를 다시 로드한 뒤 Agent에 현재 사용자, 연결된 계정, 북마크 도구의 schema를 확인하도록 요청하세요. 계정이 불분명하거나 권한 승인이 완료되지 않았다면 먼저 중단하세요. 다른 사람의 계정으로 전환해서는 안 됩니다.

**3. 첫 북마크를 Agent로 정리.** 아래 요청의 경로를 실제 절대 경로로 바꾸세요.

> /absolute/path/xstash/SKILL.md를 사용해, 현재 Agent에서 권한을 승인한 CoreSpeed의 개인 X 계정으로 북마크를 최대 5개 읽어 주세요. 원문을 보존하고, 내용에 충실한 한국어 요약과 1–4개의 태그를 생성한 뒤 http://127.0.0.1:4317로 가져오고, 다시 읽어 검증해 주세요. 실제로 읽은 수, 새로 추가한 수, 검증한 수와 누락된 필드 및 조회 범위를 보고해 주세요. 데모 데이터를 사용하거나 X를 변경하거나 과거 메모리를 읽지 마세요. 계정이 불분명하거나 권한이 부족하면 중단하고 이유를 설명해 주세요.

갤러리를 새로 고치면 확인할 수 있습니다. 요약은 선택한 Agent가 생성합니다. xstash에는 모델 서비스나 모델 구독이 포함되어 있지 않습니다.

**요금과 조회 범위.** **2026-10-03** 기준 CoreSpeed [요금 페이지](https://corespeed.io/pricing)에는 Free: $0, 3,000 credits / 90일, Pro: $20 / 월, 10,000 credits / 월로 표시되어 있습니다. [결제 문서](https://corespeed.io/docs/billing)의 환산 기준은 1,000 credits = $1입니다. 공개 요금 페이지에는 북마크 도구의 명확한 단가가 없으므로, 여기서는 “동기화 한 번에 몇 센트”와 같은 요금을 보장하지 않습니다. 공개 게시물 읽기 요금을 북마크 요금으로 적용해서도 안 됩니다. 먼저 소량으로 실행한 뒤 [Billing](https://app.corespeed.io/billing)에서 실제 사용량과 예산을 확인하세요. 최신 요금이 적용됩니다.

현재 프로젝트에서 검증한 `twitter__get_my_bookmarks` schema(2026-10-03 재확인)에는 `account`와 `max_results`만 있고 페이지네이션 입력은 없습니다. 응답에 `next_token`이 포함되더라도 페이지네이션 매개변수를 임의로 추가할 수 없습니다. 따라서 현재 CoreSpeed 워크플로는 **일부 북마크의 스냅샷**이며, 전체 이력 동기화를 보장하지 않습니다. 누락된 작성자와 미디어 정보를 지어내지 않습니다. 실행할 때마다 실제 schema를 다시 확인해야 합니다.

### B: 공식 X API에 직접 연결

X 개발자 App, 권한, 결제를 직접 관리하려는 개발자에게 적합합니다. **현재 xstash에는 공식 X API OAuth 클라이언트나 데이터 조회 어댑터가 내장되어 있지 않습니다.** 이 방법에서는 사용자 또는 Agent가 데이터 조회 부분을 작성, 검토, 유지 보수하고, 응답을 기존 JSON / stdin 브리지로 전달해야 합니다. 별도의 로그인 버튼만 누르면 바로 쓸 수 있는 방식은 아닙니다.

1. **개발자 접근 권한 설정.** 자신의 X 계정으로 [Developer Console](https://console.x.com)에 접속해 현재 등록 절차, 사용 목적 설명, 필요한 약관 동의를 완료하세요. 현재 콘솔의 New App 절차에 따라 App을 만들고 이름, 설명, 사용 목적을 입력하세요. 콘솔에서 Project를 요구한다면 Project를 만들거나 선택하세요. [개발자 App 문서](https://docs.x.com/fundamentals/developer-apps)를 참고하세요.
2. **App 설정.** OAuth 2.0 사용자 인증을 활성화하고 구현에 맞는 앱 유형을 선택한 뒤, OAuth 2.0 Client ID를 보관하세요(confidential client에는 Client Secret도 필요합니다). 정확한 콜백 URL과 웹사이트 URL을 등록하세요. 콜백 처리는 직접 구현해야 하며, xstash 갤러리 주소를 그대로 콜백 처리기처럼 사용할 수는 없습니다. 공식 문서는 로컬 콜백에 `http://127.0.0.1`을 권장합니다. 인증 요청의 URI는 등록한 값과 정확히 일치해야 합니다.
3. **권한과 예산 확인.** 북마크를 읽으려면 `bookmark.read tweet.read users.read`가 필요합니다. 갱신 토큰이 필요한 경우에만 `offline.access`를 추가하세요. 읽기 전용 흐름에는 `bookmark.write`가 필요하지 않습니다. 콘솔에서 엔드포인트 권한을 확인하고 credits를 충전한 뒤 예산을 설정하세요. X는 현재 선불 credits 기반의 사용량 과금 방식입니다. 이전 Basic / Pro 월정액 요금제 안내를 그대로 따르지 마세요.
4. **사용자 OAuth 완료.** [OAuth 2.0 Authorization Code + PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)에 따라 구현하세요. 무작위 `state`와 PKCE verifier / challenge를 생성하고 사용자 권한 승인 페이지로 이동시킵니다. 콜백의 `state`를 검증한 뒤, 반환된 code와 verifier로 사용자의 access token을 발급받습니다. 해당 권한을 요청하고 refresh token을 받은 경우에만 토큰 갱신을 구현하세요. 인증 정보는 자신이 관리하는 인증 정보 저장소에 보관하고, 코드 저장소, 북마크 JSON, 공개 로그에 넣지 마세요.
5. **본인의 북마크 읽기.** 해당 사용자 token으로 `GET /2/users/me`를 호출해 사용자 ID를 확인한 뒤, `GET /2/users/{id}/bookmarks`를 호출하세요. App-only bearer token으로는 개인 비공개 북마크를 읽을 수 없습니다. 경로의 ID는 권한을 승인한 사용자와 일치해야 합니다. [북마크 조회 문서](https://docs.x.com/x-api/users/get-bookmarks)에 따라 필요한 필드와 author / media expansions를 요청하세요. 페이지당 `max_results`는 1–100이며, 다음 페이지에서는 반환된 `next_token`을 `pagination_token`으로 사용합니다. 현재 [조회 속도 제한](https://docs.x.com/x-api/fundamentals/rate-limits)은 사용자당 15분에 180회입니다. 429 응답을 받으면 `x-rate-limit-reset`을 따르세요. 속도 제한과 과금은 서로 다른 제약입니다. API가 반환하는 범위를 전체 이력의 완전한 백업이라고 표현해서는 안 됩니다.
6. **xstash에 연결.** 성공한 X-style JSON 응답(`data`, 선택 사항인 `includes` / `meta`)을 비공개 파일로 저장하거나 [표준 envelope](docs/IMPORT_FORMAT.md)로 변환하세요. Step 2의 프로젝트 디렉터리에서 아래 명령을 실행하세요. 브리지는 데이터를 가져온 뒤 다시 읽어 검증하며, 오류 응답은 거부합니다. 입력에 비밀 token을 포함하면 안 됩니다.

```sh
node scripts/agent-bridge.mjs doctor http://127.0.0.1:4317
node scripts/agent-bridge.mjs import http://127.0.0.1:4317 < /private/path/bookmarks.json
```

**공식 X API 요금.** [현재 공식 요금](https://docs.x.com/x-api/getting-started/pricing)(2026-10-03 확인)은 리소스 단위로 부과됩니다. 표준 Post read는 **리소스당 $0.005**입니다. **Owned Reads** 조건을 충족하는 경우, 즉 인증된 사용자가 개발자 App도 소유하고 있다면 자신의 북마크 읽기는 **리소스당 $0.001**입니다. 예를 들어 조건에 맞는 북마크 리소스 100개만 계산하면 예상 비용은 **$0.10**입니다. 이는 “API 요청 한 번에 $0.10”이라는 고정 요금이 아닙니다. 추가 사용자 조회, 다른 리소스, Agent 모델 비용은 별도입니다. 실제 엔드포인트, 리소스 분류, 콘솔 청구 내역을 기준으로 확인하세요.

### 어떤 방법을 선택할까요?

| 비교 항목 | A: CoreSpeed MCP(권장) | B: 공식 X API 직접 구현 |
| --- | --- | --- |
| 연결 절차 | MCP 추가 → 로그인 → X 연결 → Skill 호출 | 개발자 등록 → App 설정 → PKCE 사용자 권한 승인 → 조회 구현 → 브리지 연결 |
| 인증 정보 관리 | CoreSpeed와 Agent의 권한 승인 체계에서 관리. xstash는 저장하지 않음 | App 설정과 사용자 token을 직접 안전하게 보관하고, 갱신과 폐기도 처리 |
| 요금 | CoreSpeed 요금제 / credits. 북마크의 실제 사용량은 콘솔에서 확인 | X 선불 credits로 리소스 단위 과금. Owned Reads에는 자격 조건이 있음 |
| 유지 보수 | CoreSpeed가 외부 서비스 연결을 관리. 재인증, 한도, schema 변경에는 계속 대응해야 함 | OAuth, 페이지네이션, 재시도, 속도 제한, 필드 매핑, API 변경을 직접 관리 |
| 북마크 조회 범위 | 현재 검증한 도구에는 페이지네이션 입력이 없어 일부 스냅샷만 제공 | 공식 엔드포인트는 페이지네이션 지원. 다만 엔드포인트 범위, 조회 가능 여부, 한도에 따른 제약이 있음 |
| xstash 지원 상태 | 루트 디렉터리의 Skill에 해당 워크플로와 로컬 브리지 포함 | 표준 JSON / stdin 가져오기 지원. X OAuth / 조회 어댑터는 내장되어 있지 않음 |

두 방법 모두 별도로 자신의 Agent / 모델 서비스가 필요합니다. CoreSpeed를 선택하는 주된 이유는 연결과 유지 보수 부담을 줄이기 위해서이며, 검증되지 않은 저렴한 요금을 보장하기 때문이 아닙니다.

## 제공 기능

- 흑백 카드 갤러리, 단일 키워드 검색, 읽기 전용 상세 화면.
- Agent가 출처를 기록한 요약과 태그를 생성. 원문과 요약은 별도로 보존.
- 문자열 ID 기준 중복 제거와 병합. 스냅샷을 반복해서 가져와도 이번에 포함되지 않은 기존 항목은 삭제하지 않음.
- 로컬 디스크 저장, CLI 백업 내보내기와 병합 복원. 기존 메모, 즐겨찾기, 주석은 유지.
- 기본적으로 외부 이미지를 불러오지 않음. 상세 화면에서 명시적으로 활성화한 경우, 해당 상세 화면 세션에서만 불러옴.

현재 자동 백그라운드 동기화, 전체 이력 수집, 시맨틱 검색, 기기 간 동기화, 다중 사용자 시스템, X 쓰기 작업, 동영상 플레이어, 수동 가져오기 / 편집 UI는 제공하지 않습니다. 아직 초기 단계의 프로젝트입니다. 전체 제한 사항은 [데이터 형식](docs/IMPORT_FORMAT.md)과 [개인정보 보호 안내](docs/PRIVACY.md)를 확인하세요.

## 로컬 데이터, 백업, 업그레이드

Node 서비스는 `127.0.0.1`에서만 요청을 수신하며, 기본적으로 프로젝트 안의 `data/bookmarks.json`에 저장합니다. 운영 환경용 로그인 인증은 없습니다. 공개 터널이나 리버스 프록시를 통해 개인 라이브러리를 공개하지 마세요. 북마크는 로컬에 저장되지만, Agent / CoreSpeed로 처리할 때는 각 서비스의 데이터 처리 약관이 적용됩니다. “로컬 우선”이 전체 처리 과정의 오프라인 실행을 뜻하지는 않습니다.

프로젝트 디렉터리에서 실행하세요.

```sh
node cli.mjs stats
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
node cli.mjs --help
```

`export`는 기존 파일을 덮어쓰지 않습니다. `restore`는 기존 데이터를 비우고 교체하지 않고 병합합니다. 일반 가져오기는 배치당 최대 10 MiB / 10,000개이며, 전체 로컬 라이브러리와 백업 복원은 최대 100 MiB / 50,000개입니다. 백업과 정확히 같은 사본이 필요하다면 새로운 라이브러리 경로로 복원하세요. CLI의 `--store` 또는 서비스의 `BOOKMARK_STORE`로 비공개 파일을 지정할 수 있습니다. 새로 설치하거나 소스를 업데이트한 뒤 CLI / 브리지를 별도로 실행하기 전에는 먼저 `npm run build`를 실행하세요.

이전 이름인 Commonplace에서 업그레이드할 때는 기존 `data/bookmarks.json`을 먼저 백업하고, 백업 사본으로 검증하세요. v1 데이터 형식과 `commonplace.library.v1` 브라우저 저장소 키의 호환성은 유지됩니다. `BOOKMARK_STORE=/绝对路径/旧库.json npm start`로 기존 라이브러리를 선택할 수 있습니다(경로는 실제 절대 경로로 바꾸세요). 새 디렉터리의 빈 라이브러리로 덮어쓰지 마세요.

정적 빌드인 `dist/`에는 비공개 `data/`도, Node API도 포함되지 않습니다. 정적 미리보기는 가상의 예시를 표시하므로 실제 로컬 북마크 라이브러리를 대신할 수 없습니다. 기존 브라우저 라이브러리는 계속 도메인별로 독립적으로 저장됩니다. 외부 이미지를 활성화하면 이미지 호스트로 네트워크 요청을 보내며, 원문 링크를 클릭하면 X에 접속합니다.

## 개발 및 기여

```sh
npm ci
npm run check
npm test
npm run build
```

기술 스택은 strict 모드의 TypeScript, React, Vite, Node HTTP 서버이며 별도 데이터베이스는 없습니다. [아키텍처](docs/ARCHITECTURE.md), [기여 가이드](CONTRIBUTING.md), [테스트](docs/TESTING.md), [Agent 워크플로](docs/SKILL.md), [독립 인수 테스트](docs/CLEAN_AGENT_ACCEPTANCE.md)를 참고하세요. 테스트 fixtures는 모두 가상 데이터이며, 테스트에는 실제 X 또는 CoreSpeed 인증 정보가 필요하지 않습니다.

## 라이선스 및 감사의 말

[MIT License](LICENSE). [Milton / HeYan](https://github.com/MiltonHeYan)이 시작한 프로젝트이며, 기여를 환영합니다. MIT 라이선스는 이 프로젝트의 코드와 직접 만든 예시에 적용되며, 제3자의 게시물, 미디어, 상표에 대한 사용 권한을 부여하지 않습니다.

xstash는 독립적인 오픈 소스 프로젝트입니다. Claude, Codex, Cursor, OpenClaw, X, CoreSpeed의 이름과 로고는 각 권리자에게 귀속됩니다. [로고 출처](docs/assets/agents/README.md). 표시는 호환 도구를 식별하기 위한 것이며, 공식 제휴, 인증, 보증을 뜻하지 않습니다. 서비스 요금, 권한, 약관은 각 서비스의 최신 안내를 기준으로 합니다.
