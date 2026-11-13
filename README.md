# Sweat Stamp

`TAEM`, `SAM`, `SOOK`, `YOOM` 네 사람이 매일 자신의 운동을 체크하고 사진으로 인증하는 모바일 우선 PWA입니다.

## 주요 기능

- 네 사람에게 각각 다른 색상과 동물 캐릭터(TAEM 토끼, SAM 코알라, SOOK 표범, YOOM 아기 사슴)가 적용되는 개인 인증 화면
- 멤버별 메인 운동(Ballet, Pilates, Pilates, Diet Dance)이 미리 채워지고, 서브 운동(Stretching)은 한 번에 선택
- 운동 완료 체크와 카메라·앨범 사진 첨부. 사진이 없으면 캐릭터의 메인 운동 이미지에 스탬프를 찍어 인증
- 선택한 사진에 `SWEAT STAMP`, 멤버명, 앱에서 선택한 날짜·시간 합성
- 브라우저를 닫아도 유지되는 오늘 인증 상태와 사진
- 네 사람의 오늘 인증 현황을 한 화면에서 확인

## 기술 스택

- **Framework**: Next.js 16 App Router
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, Radix UI, Base UI
- **Icons**: Lucide React
- **Persistence**: Supabase Postgres, Supabase Storage
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

Supabase가 설정되면 운동 인증은 Postgres에, 스탬프 사진은 `certification-photos` Storage bucket에 저장되어 여러 기기에서 함께 보입니다. Supabase가 설정되지 않았거나 연결할 수 없으면 기존 LocalStorage와 IndexedDB 저장으로 자동 전환됩니다.

### Supabase 설정

1. Supabase SQL Editor에서 [supabase/migrations/202611130001_create_certifications.sql](./supabase/migrations/202611130001_create_certifications.sql) 전체를 실행합니다.
2. `.env.example`을 참고해 로컬 `.env.local`과 Vercel에 아래 Config 값을 등록합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

3. Vercel에서 새 배포를 실행합니다. 연결되면 앱 헤더에 저장 상태 문구가 표시되지 않습니다. `공동 저장에 연결하지 못해 이 기기에만 저장돼요`가 보이면 SQL 마이그레이션과 Data API 설정을 확인합니다.

이 MVP는 로그인 없이 네 멤버가 사용하는 구조라 RLS가 멤버 ID, 날짜, 파일 경로와 형식을 제한합니다. 공개 배포 후 쓰기 권한을 더 강하게 보호하려면 멤버별 PIN 또는 Supabase Auth를 추가해야 합니다.

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
| `node scripts/build-character-assets.mjs` | `../sweat-stamp-img` 원본으로 캐릭터·아이콘·공유 이미지 재생성 (`CHARACTER_IMAGE_DIR`로 경로 변경) |

새 환경에서 E2E 테스트를 처음 실행하기 전에는 Chromium을 설치합니다.

```bash
bunx playwright install chromium
```

## 프로젝트 구조

- [app/page.tsx](./app/page.tsx): 앱 진입점
- [components/sweat-stamp-app.tsx](./components/sweat-stamp-app.tsx): 4인 사진 인증 플로우
- [lib/member-profiles.ts](./lib/member-profiles.ts): 사람별 이름, 색상, 캐릭터 이미지, 메인·서브 운동 설정
- [lib/default-workout-photo.ts](./lib/default-workout-photo.ts): 사진 없이 인증할 때 쓰는 메인 운동 이미지 로드
- [public/characters](./public/characters): 캐릭터 portrait, avatar, workout 이미지
- [lib/certification-photo-store.ts](./lib/certification-photo-store.ts): IndexedDB 사진 저장
- [lib/shared-certifications.ts](./lib/shared-certifications.ts): Supabase 공동 인증 저장
- [supabase/migrations](./supabase/migrations): 테이블, Storage, RLS 정책
- [CLAUDE.md](./CLAUDE.md), [AGENTS.md](./AGENTS.md): 저장소 작업 규칙과 아키텍처 지침
