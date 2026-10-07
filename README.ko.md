# xrecall

**흩어진 디자인 자료를 Agent가 찾고 설명할 수 있는 맥락으로.**

Agent에게 이 한 줄을 전달하세요:

```text
https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md 를 읽고 xrecall 설치와 내가 허용한 디자인 자료의 정리 및 검색을 도와주세요.
```

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## “이미지는 저장했는데 스타일 이름을 모르겠어요.”

Agent가 저장한 UI 또는 인테리어 원본 이미지를 보고 시각적 특징과 근거가 있는 스타일 가설을 기록합니다. 디자인할 때 관련 원본과 공통점을 비교하고, 사용자가 방향을 확인하면 요구사항으로 정리합니다. 로컬 관계도에서 연결을 탐색할 수 있습니다.

저장이 곧 취향은 아닙니다. 스타일은 확인 전까지 가설이며, 볼 수 없는 이미지는 미분석 상태로 둡니다.

## 필요한 것

Git, Node.js 22.12+, 로컬 명령 실행과 이미지 이해가 가능한 Agent. 기존 connector가 허용된 자료를 가져오고 xrecall이 정리와 검색을 담당합니다. 메모리는 로컬에서 사용하며 외부 백엔드는 직접 선택합니다. [CoreSpeed](https://corespeed.io) — 선택 가능한 연결 방법。

[설치와 사용](SKILL.md) · [디자인 흐름과 관계도](docs/DESIGN.md) · [X 입력](docs/SYNC_BOOKMARKS.md) · [메모리](docs/MEMORY.md) · [기여](CONTRIBUTING.md)

MIT · [Milton / HeYan](https://github.com/MiltonHeYan) · 기존 xstash 데이터 경로와 명령의 호환성을 유지합니다.
