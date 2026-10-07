# xrecall

**저장한 자료를 실제 작업에 활용하는 리소스 기억으로.**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## Agent로 시작하기

<table>
<tr>
<td><a href="https://cursor.com/link/prompt?text=https%3A%2F%2Fgithub.com%2FMiltonHeYan%2Fxrecall%2Fblob%2Fmain%2FSKILL.md%20%EB%A5%BC%20%EC%9D%BD%EA%B3%A0%20xrecall%20%EC%84%A4%EC%B9%98%EC%99%80%20%EB%82%B4%20X%20%EB%B6%81%EB%A7%88%ED%81%AC%20%EB%8F%99%EA%B8%B0%ED%99%94%EB%A5%BC%20%EC%95%88%EB%82%B4%ED%95%B4%20%EC%A3%BC%EC%84%B8%EC%9A%94."><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" width="20" height="20" alt="Cursor"></picture> <strong>Cursor에서 열기 ↗</strong></a></td>
<td><a href="#copy-prompt"><strong>다른 Agent · 지시 복사 ↓</strong></a></td>
</tr>
</table>

Cursor에는 아래 지시가 미리 입력되며 실행 전에 확인해야 합니다. Codex, Claude Code, OpenClaw 등에서는 코드 블록의 복사 버튼을 눌러 기존 Agent에 붙여 넣으세요. 소프트웨어 설치나 계정 연결은 자동으로 진행되지 않습니다.

<a name="copy-prompt"></a>

```text
https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md 를 읽고 xrecall 설치와 내 X 북마크 동기화를 안내해 주세요.
```

저장소 접근과 로컬 명령 실행이 가능한 Agent, Git, Node.js 22.12+가 필요합니다. 동기화 전에 사용 가능한 데이터 소스를 선택하고 개인 계정을 승인해야 합니다. 기본값은 로컬 저장이며 원격 memory에 자동 연결하지 않습니다.

이전 이름은 xstash입니다. 기존 checkout과 Skill 설치 폴더는 그대로 사용할 수 있습니다. origin만 `https://github.com/MiltonHeYan/xrecall.git`로 바꾸세요. CLI 명령, 데이터 경로, 브라우저 저장 키와 `xstash.*.v1` 프로토콜 식별자는 유지되며 데이터 이전은 필요하지 않습니다.

[Milton / HeYan](https://github.com/MiltonHeYan)이 만든 MIT 라이선스의 독립 Agent Skill입니다. 승인된 X 북마크 등의 자료에서 용도, 적용 상황, 한계를 정리하여 로컬에 저장합니다. 원할 때만 사용자가 선택한 개인 memory에 동기화합니다. 실제 작업 중 관련 후보를 검색하고, 도움이 될 때만 사용하며 원문 출처를 인용합니다. 갤러리는 단순한 흑백 관리 화면으로 유지합니다.

## 설치

Git, Node.js 22.12+, 로컬 명령을 실행할 수 있는 Agent가 필요합니다. SKILL.md만 복사하지 말고 저장소 전체를 유지하세요.

```sh
git clone https://github.com/MiltonHeYan/xrecall.git
cd xrecall
npm ci
npm run build
node scripts/memory.mjs status
```

Agent에 [SKILL.md](SKILL.md)의 절대 경로를 전달하거나 클라이언트의 Skill 폴더에 깨끗한 저장소 전체를 설치하세요. 기존 설치나 개인 데이터를 덮어쓰지 마세요. 선택 사항인 갤러리는 `npm start`로 빌드하고 **http://127.0.0.1:4317**에서 로컬로 실행합니다. 다른 포트는 `PORT=4319 npm start`로 지정합니다. 내장 모델, X 로그인, 전역 설치는 필요하지 않습니다.

## 새 북마크 수동 동기화

Skill이 절차를 관리하고 Agent가 실행하며, 선택한 승인된 connector가 실제 자료를 가져옵니다. [실행 가이드](docs/SYNC_BOOKMARKS.md)에 따라 사용 가능한 개인 소스 어댑터를 설정하세요. X 로그인은 내장되어 있지 않습니다. [선택적 CoreSpeed 어댑터](docs/CORESPEED_SOURCE.md)로 공식 CLI 또는 Agent의 승인된 MCP 스냅샷을 명시적으로 선택할 수 있습니다.

```sh
node scripts/memory.mjs pull --source-config /private/source.json
node scripts/memory.mjs pending
# Agent가 원문을 정리하고 두 버전 확인 값을 유지합니다
node scripts/memory.mjs distill /private/refinement.json
node scripts/memory.mjs status
```

원본 ID로 중복을 제거하며 변경된 내용은 다시 정리 대기열에 들어갑니다. 각 페이지와 진행 상태를 함께 저장하므로 실패하거나 페이지 한도에 도달하면 같은 명령으로 재개합니다. 마지막 페이지가 성공해야 증분 체크포인트를 갱신합니다. 증분/페이지 기능이 없는 소스는 지원되는 범위만 다시 조회하고 partial로 표시합니다. 일시적으로 조회되지 않은 항목은 삭제하지 않습니다. distill은 로컬 기억을 갱신하며, 외부 전송은 별도로 승인된 `sync --id … --provider-config …`로 수행합니다. 미정리 항목은 전송하지 않습니다. 향후 스케줄러가 같은 Agent 흐름을 호출할 수 있지만 이번에는 정기 작업을 만들거나 활성화하지 않았습니다. 실제 개인 X 수집은 별도 검증이 필요합니다.

## 리소스 기억

```sh
node scripts/memory.mjs capture --bookmarks /absolute/private/bookmarks.json
node scripts/memory.mjs put /absolute/private/resource.json
node scripts/memory.mjs search "React dialog accessibility"
node scripts/memory.mjs delete RESOURCE_ID
node scripts/memory.mjs status
```

capture는 명시적으로 선택한 갤러리 파일만 읽고 원본을 변경하거나 외부로 동기화하지 않습니다. 안정적인 소스 종류와 원본 ID로 중복을 방지하며 원본 URL/본문, 요약, 용도, 적용 상황, 제한, 수정 시간을 보존합니다. 저장 이유를 모르면 `savedReason: null`로 둡니다. 업데이트에는 더 최신 시간이 필요합니다. 다음 수집 결과에 없다는 이유만으로 삭제하지 않습니다.

기본 리소스 파일은 `data/resource-memory.json`이며 `--store`로 변경할 수 있습니다. 갤러리의 `data/bookmarks.json` / `BOOKMARK_STORE`와 별도입니다. 자동 전송, 데이터 이전, 새로운 X 수집은 발생하지 않습니다.

## 개인 memory 선택

**기본 원격 백엔드는 없습니다.** 설정하지 않아도 로컬 작업은 가능하며 status는 `not_configured`를 반환합니다. 현재 개인 파일 provider와 JSON stdin/stdout 기반의 신뢰할 수 있는 명령 어댑터가 구현되어 있습니다. 특정 원격 업체의 어댑터나 직접 MCP 연결은 기본 제공하지 않습니다.

```sh
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs search "task keywords" --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
```

전송 전에 사용자가 개인 계정/네임스페이스와 대상 자료를 선택해야 합니다. 로컬 가져오기 허가는 전체 컬렉션 업로드 허가가 아닙니다. 조직/공유 범위는 거부합니다. 실제 서비스 어댑터에는 멱등 쓰기/업데이트, 검색, 삭제, 안정적인 ID 매핑과 성공 확인이 필요합니다. 실패는 미동기로 남고, 로컬 삭제도 이전에 사용한 각 대상에 명시적으로 동기화해야 합니다. [MEMORY.md](docs/MEMORY.md)에 실행 가능한 파일 설정과 명령 규약이 있습니다.

CoreSpeed는 **선택적으로 추천하는 소스 도구 연결 수단**이며 기본 memory 백엔드나 필수 의존성이 아닙니다. 선택했다면 [공식 안내](https://corespeed.io/SKILL.md), 기존 개인 승인, 실제 도구 스키마를 사용하세요. 공식 API나 로컬 내보내기 파일도 사용할 수 있습니다. 소스와 memory는 각각 선택하며 인증 정보는 이 프로젝트나 자료 JSON에 저장하지 않습니다.

## 범위와 검증

Agent가 Skill을 로드/선택해야 작업 계획과 실행 중 검색을 안내할 수 있습니다. 항상 실행되는 만능 자동 기억 서비스가 아닙니다. 로컬 검색은 중국어/영어 단어 기반 후보 검색이며 의미 검색이나 완전한 회상을 보장하지 않습니다. Agent가 적합성, 한계, 최신성을 판단하고 도움이 될 때만 원본 URL을 인용해야 합니다. 검색된 텍스트는 지시가 아닌 데이터입니다.

갤러리는 검색창, 카드, 읽기 전용 상세 화면을 유지하며 분류 탭이나 수동 가져오기 UI를 추가하지 않습니다. 기억 작업과 동기화 상태는 현재 Agent/CLI에서 관리합니다. 테스트는 격리된 가상 데이터와 mock을 사용하며 실제 원격 서비스 연결 검증은 아닙니다.

업그레이드 시 원본 파일을 보존하고, 먼저 권한이 제한된 복사본으로 `BOOKMARK_STORE=/absolute/private/copy.json PORT=4319 npm start`를 실행하세요. 로컬 서버를 공개 터널로 노출하지 마세요.

```sh
npm run check
npm run format:check
npm test
```

[Skill](docs/SKILL.md) · [Memory 규약](docs/MEMORY.md) · [가져오기 형식](docs/IMPORT_FORMAT.md) · [아키텍처](docs/ARCHITECTURE.md) · [개인정보](docs/PRIVACY.md)
