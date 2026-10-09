```text
https://github.com/MiltonHeYan/xbrain/blob/main/SKILL.md 를 읽고 Xbrain 설치와 내가 허용한 디자인 자료의 정리 및 검색을 도와주세요.
```

# Xbrain

**흩어진 디자인 자료를 Agent가 찾고 설명할 수 있는 맥락으로.**

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Xbrain 콘셉트 영상: 저장한 자료, Gallery와 Brain](docs/assets/xbrain-demo-v6.jpg)](https://github.com/corespeed-io/xbrain/releases/download/demo-video-v6/Xbrain-concept-v6.mp4)

[▶ 34초 콘셉트 영상 열기 (MP4)](https://github.com/corespeed-io/xbrain/releases/download/demo-video-v6/Xbrain-concept-v6.mp4)

## “이미지는 저장했는데 스타일 이름을 모르겠어요.”

Agent가 저장한 UI 또는 인테리어 원본 이미지를 보고 시각적 특징과 근거가 있는 스타일 가설을 기록합니다. 디자인할 때 관련 원본과 공통점을 비교하고, 사용자가 방향을 확인하면 요구사항으로 정리합니다. 로컬 관계도에서 연결을 탐색할 수 있습니다.

저장이 곧 취향은 아닙니다. 스타일은 확인 전까지 가설이며, 볼 수 없는 이미지는 미분석 상태로 둡니다.

![Xbrain 하드웨어 참고 자료 그래프와 원본 근거](docs/assets/xbrain-graph.png)

## 필요한 것

Git, Node.js 22.12+, 로컬 명령 실행과 이미지 이해가 가능한 Agent. 기존 connector가 허용된 자료를 가져오고 Xbrain이 정리와 검색을 담당합니다. 메모리는 로컬에서 사용하며 외부 백엔드는 직접 선택합니다. [CoreSpeed](https://corespeed.io) — 선택 가능한 연결 방법。

## Agent와 X 계정 접근 권한

Agent와 X 연결 방식은 별도로 선택합니다. Claude Code, Codex, Muse, OpenClaw, Hermes 등 로컬 명령과 이미지 이해를 지원하는 Agent를 사용할 수 있습니다. 비공개 북마크를 읽으려면 본인이 허용한 데이터 소스가 필요하며, 공개 X 검색만으로는 접근할 수 없습니다.

[Grok Bot의 X 플러그인](https://docs.x.ai/grok-bot/tag-on-x) 공식 문서는 북마크 기능을 안내합니다. 다만 Xbrain에는 Grok Bot 어댑터가 없으며, 이를 통한 전체 가져오기 과정도 검증하지 않았습니다. 다른 Agent를 사용하려면 다음 연결 방식을 선택할 수 있습니다.

- **공식 X API:** [개발자 계정과 앱](https://docs.x.com/x-api/getting-started/getting-access)을 등록하고, [X의 현재 요금](https://docs.x.com/x-api/getting-started/pricing)에 따라 API 사용량을 구매한 뒤 사용자 OAuth로 본인 계정을 승인합니다. 북마크 읽기에는 `bookmark.read`와 해당 엔드포인트가 요구하는 다른 권한이 필요합니다. Xbrain에는 X OAuth 클라이언트나 직접 API 어댑터가 포함되어 있지 않으므로 검토된 [소스 어댑터](docs/SYNC_BOOKMARKS.md)가 필요합니다.
- **선택 사항인 CoreSpeed MCP:** [CoreSpeed](https://corespeed.io)가 연결 설정을 처리합니다. Agent에게 `set up https://corespeed.io/SKILL.md`를 전달하고 개인 X 계정을 연결한 뒤, 포함된 [CoreSpeed 소스 어댑터](docs/CORESPEED_SOURCE.md)를 사용합니다. 현재 호출 한 번에 최대 100개의 북마크만 부분적으로 가져오며 다음 페이지를 지원하지 않아 전체 기록을 보장할 수 없습니다. 과금 대상 호출은 CoreSpeed credits를 사용합니다.

인증 정보는 저장소 밖에 보관하세요. [X 북마크 권한](https://docs.x.com/x-api/posts/bookmarks/introduction)과 [OAuth 권한 범위](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)를 참고하세요.

[설치와 사용](SKILL.md) · [디자인 흐름과 관계도](docs/DESIGN.md) · [X 입력](docs/SYNC_BOOKMARKS.md) · [메모리](docs/MEMORY.md) · [기여](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 기존 xstash 데이터 경로와 명령의 호환성을 유지합니다.
