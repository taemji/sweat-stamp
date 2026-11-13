# 땀도장

`taem`, `saem`, `yum`, `ssuk` 네 사람이 매일 자신의 운동을 체크하고 사진으로 인증하는 모바일 우선 PWA입니다.

## 주요 기능

- 네 사람에게 각각 다른 색상과 캐릭터가 적용되는 개인 인증 화면
- 사람마다 독립적으로 저장되는 오늘의 운동
- 운동 완료 체크와 카메라·앨범 사진 첨부
- 브라우저를 닫아도 유지되는 오늘 인증 상태와 사진
- 네 사람의 오늘 인증 현황을 한 화면에서 확인

## 기술 스택

- **Framework**: Next.js 16 App Router
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Base UI
- **Icons**: Lucide React
- **Persistence**: LocalStorage, IndexedDB
- **Testing**: Vitest, Testing Library, Playwright
- **Package manager**: Bun

## 시작하기

의존성을 설치하고 기본 HTTP 개발 서버를 실행합니다.

```bash
bun install
bun dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

HTTP 서버는 데스크톱 UI 작업에 충분합니다. 다른 휴대폰에서 카메라 촬영을 테스트하려면 HTTPS 개발 서버를 사용합니다.

## 휴대폰 카메라 테스트

모바일 브라우저에서 카메라 접근은 보안 컨텍스트가 필요할 수 있습니다. 실제 휴대폰에서 촬영을 테스트할 때는 HTTPS 개발 서버를 실행합니다.

```bash
bun run dev:https
```

스크립트는 현재 LAN IP를 감지하고, 해당 IP에 맞는 임시 self-signed 인증서를 만든 뒤 Next.js를 HTTPS로 실행합니다. 출력되는 LAN 주소를 휴대폰 브라우저에서 엽니다.

```text
https://192.168.1.167:3000
```

처음 접속할 때 브라우저가 self-signed 인증서 경고를 표시할 수 있습니다. 로컬 테스트 목적이면 경고를 통과해서 접속합니다.

LAN IP 자동 감지가 잘못되면 직접 지정할 수 있습니다.

```bash
LAN_IP=192.168.1.167 bun run dev:https
```

Windows PowerShell에서는 다음처럼 지정합니다.

```powershell
$env:LAN_IP="192.168.1.167"; bun run dev:https
```

브라우저가 요청하는 카메라 권한을 허용하면 촬영 화면을 사용할 수 있습니다. 앨범에서 기존 사진을 선택하는 것도 가능합니다.

## 기록 저장

운동명과 완료 상태는 LocalStorage에, 인증 사진은 IndexedDB에 저장합니다. 현재는 한 기기의 한 브라우저 안에서만 기록이 유지됩니다. 여러 기기 동기화는 이후 서버 저장소를 연결해야 합니다.

## 스크립트

| 명령어 | 설명 |
|---|---|
| `bun dev` | 기본 HTTP 개발 서버 실행 |
| `bun run dev:https` | 휴대폰 센서 테스트용 HTTPS LAN 개발 서버 실행 |
| `bun run build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 실행 |
| `bun run lint` | ESLint 실행 |
| `bun run test` | Vitest 실행 |
| `bun run test:watch` | Vitest watch 모드 실행 |
| `bun run test:e2e` | Playwright E2E 테스트 실행 |

새 환경에서 E2E 테스트를 처음 실행하기 전에는 Chromium을 설치합니다.

```bash
bunx playwright install chromium
```

## 프로젝트 구조

- [app/page.tsx](./app/page.tsx): 앱 진입점
- [components/sweat-stamp-app.tsx](./components/sweat-stamp-app.tsx): 4인 사진 인증 플로우
- [lib/member-profiles.ts](./lib/member-profiles.ts): 사람별 이름, 색상, 캐릭터 설정
- [lib/certification-photo-store.ts](./lib/certification-photo-store.ts): IndexedDB 사진 저장
- [CLAUDE.md](./CLAUDE.md), [AGENTS.md](./AGENTS.md): 저장소 작업 규칙과 아키텍처 지침
