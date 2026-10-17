# 클래스픽 (ClassPick)

> **지문 하나로, 수업 준비가 달라집니다.**
> 국어 교사·강사를 위한 AI 수업 자료 SaaS — 지문 한 편으로 작품 도식화, 행간주 해설, 문제 은행, 시험지 분석 보고서까지 만들고 **HWPX · DOCS · PDF**로 내려받습니다.

이 저장소는 `read.md`(AI 프롬프트 패키지·개발 로드맵)와 `Copy.md`(랜딩페이지 카피 정의서)를 바탕으로 구축한 풀스택 웹 플랫폼입니다.

---

## 1. 주요 기능

| # | 기능 | 화면 | 내보내기 |
|---|------|------|----------|
| ① | **작품 도식화 & 구조 분석** — 갈래·성격·시점, 전개 흐름도, 인물 관계도, 출제 포인트 | `/app/new` → 자료 보기 | HWPX · DOCS · PDF |
| ② | **행간주 & 구절별 정밀 해설** — 원문 인용 + 표현 기법 태그 + 출제 포인트 | 〃 | 〃 |
| ③ | **문제 은행** — 5지선다(선지별 해설), 서술형(채점 기준), OX 오개념, 초성 어휘 퀴즈 | 〃 | 교사용 / 학생용 분리 |
| ④ | **시험지 구조·난이도 분석 보고서** — 난이도·영역 분포, 문항별 분석, 학습 전략, 학부모 상담 가이드 | `/app/exam-analysis` | 〃 |
| ⑤ | **스캔 문서 스마트 OCR** — 스캔 PDF·이미지 → 편집 가능한 HWPX (텍스트 문서는 무료 추출) | `/app/ocr` | HWPX · DOCS |
| ⑥ | **여러 지문 모음 시험지 제본** — 지문 순서·출제 유형 선택, 연속 번호·정답표 자동 정리 | `/app/exam-builder` | 교사용 / 학생용 |

### 학생 포털 · 시험 배포 (`claude/student-portal` 브랜치)

| 대상 | 기능 | 화면 |
|------|------|------|
| 선생님 | **반 만들기** — 반마다 6자리 참여 코드 발급, 학생 명단·반별 평균 관리 | `/app/classes` |
| 선생님 | **시험 배포** — 자료 보기의 「학생에게 배포」 → 반 선택, 제출 후 정답 공개 여부, **제한 시간**(수능 페이스 기준 권장값 제안) 설정. 5지선다·OX만 자동 채점 문항으로 출제 | 자료 보기 |
| 선생님 | **성적 분석** — 응시율·평균·중앙값·최고/최저, 점수 분포, 영역·난이도별 정답률, 정답률 낮은 문항과 가장 많이 고른 오답, 문항별 선택 분포, 학생별 성적, 미응시자 | `/app/assignments/:id` |
| 선생님 | **시간 분석** — 평균 응시 시간·시간 초과 인원, 문항별 평균 풀이 시간(정답자/오답자 비교), 지문(세트)별 소요 시간, 가장 오래 걸린 문항 | `/app/assignments/:id` |
| 학생 | **반 참여 · 받은 시험만 응시** — 소속 반에 배포된 시험만 보이고, 1회 제출 · 서버 채점. 남은 시간 카운트다운(5분·1분 전 알림, 시간 종료 시 자동 제출). 답안은 기기에 임시 저장되어 새로고침해도 유지 | `/student`, `/student/exams/:id` |
| 학생 | **결과 확인** — 점수, 문항별 정오, (공개 시) 정답·해설과 내가 고른 선지가 틀린 이유, 문항별 풀이 시간과 반 평균 비교 | `/student/exams/:id` |
| 학생 | **문항 질문** — 시험 결과의 문항마다 「이 문항 질문하기」로 선생님께 질문하고 추가 질문을 이어 갈 수 있음. 새 답변은 「내 질문」 메뉴와 홈에 표시. 선생님이 공개한 반 친구의 질문·답변(이름 숨김)도 볼 수 있음 | `/student/exams/:id`, `/student/questions` |
| 선생님 | **학생 질문함** — 답변 대기 / 답변 완료 / 전체로 모아 보고, 학생이 고른 답·정오·풀이 시간을 보면서 답변. 좋은 질문은 반 전체에 공개. 메뉴에 답변 대기 수 표시, 성적 분석 화면에 문항별 질문 수 표시 | `/app/questions` |
| 학생 | **약점 분석** — 지금까지 푼 모든 시험을 모아 6개 독해 영역·난이도·갈래별 정답률, 성적 추이, 약점 TOP 3와 학습 가이드, **시간 관리**(수능 페이스 대비 풀이 속도, 영역별 풀이 시간, 오래 고민하고 틀린 문항 / 빨리 풀다 틀린 문항), 오답 노트 | `/student/report` |

- 로그인 화면의 **「학생 화면 체험하기」** 로 가입 없이 학생 화면을 볼 수 있습니다 (이미 푼 시험 2개 + 풀 수 있는 시험 1개). 선생님 체험 계정에는 학생 12명의 응시 결과가 있는 체험반이 들어 있습니다.
- 학생 계정은 회원가입에서 직군 「학생」을 고르면 만들어지며, 선생님 기능(`/app`, 교사용 API)에는 접근할 수 없습니다.
- 배포 시점의 지문·문항을 **스냅샷**으로 고정하므로, 원본 자료를 고치거나 지워도 성적은 그대로 유지됩니다. 응시 전 학생에게는 정답·해설이 빠진 문제지만 전달됩니다.
- **시간 측정**: 응시 시작 시각을 서버(`exam_starts`)에 기록해, 새로고침하거나 다른 기기로 들어와도 시간이 이어지고 전체 응시 시간은 서버 기준으로 계산합니다. 제한 시간이 지나 제출되면 「시간 초과」로 표시합니다(30초 유예).
- **문항별 풀이 시간** = 직전 문항에 답한 뒤 이 문항에 답하기까지 걸린 시간(답을 바꾸면 그 시간도 더함). 한 화면에 모든 문항이 있는 시험지에서 순서대로 풀 때 가장 자연스러운 측정 방식이며, 지문 읽는 시간은 그 지문의 첫 문항에 포함됩니다. 마지막 답 이후 제출까지는 「검토·기타」 시간으로 따로 보여 줍니다.
- 기준 페이스는 수능 국어 80분·45문항(5지선다 1문항 약 1분 47초)입니다. 학생의 「빨리 풀다 틀림 / 오래 고민했지만 틀림」은 그 학생의 평소 풀이 시간(문항 형식별 중앙값)의 0.5배 미만 / 1.5배 이상으로 판정합니다.
- **문항 질문**: 시험을 제출한 학생만, 자기 반에 배포된 시험의 문항에 질문할 수 있습니다. 답변은 그 시험을 배포한 선생님만 할 수 있고, 다른 사람의 대화는 존재 여부도 알 수 없습니다(404). 반 전체에 공개된 대화는 답변이 달린 것만, 질문한 학생 이름 없이 같은 시험을 본 학생에게 보입니다.
- 약점 분석은 문항의 세부 유형(5지선다 출제 유형 · OX 관련 개념)을 **표현·서술 방식 / 시어·구절의 의미 / 작품 구성 요소 / 내용 이해·세부 정보 / 핵심 개념·관점 / <보기> 적용·감상** 6개 영역으로 묶어 계산합니다 (`src/lib/assessment.ts`).

그 밖에: 랜딩페이지(인터랙티브 미리보기·실제 샘플 다운로드), 생성 샘플 갤러리, 요금제, 이용가이드, 이용약관(저작권법 제25조·제35조의5·제37조 반영 초안), 회원가입/로그인/**가입 없는 체험 계정**, 토큰(포인트) 원장과 충전.

---

## 2. 빠르게 실행하기

```bash
npm install
npm run dev          # http://localhost:3000
```

- 환경 변수 없이 바로 실행됩니다. DB(SQLite)는 첫 요청 시 `./data/classpick.db`에 자동 생성·마이그레이션됩니다.
- 로그인 화면의 **“가입 없이 체험 계정으로 둘러보기”** 를 누르면 샘플 자료 3종이 담긴 계정으로 바로 시작합니다.
- `ANTHROPIC_API_KEY`가 없으면 **데모 엔진**으로 동작합니다. 예시 지문(진달래꽃·운수 좋은 날·언어의 본질)은 완성된 결과를, 그 밖의 지문은 형태 분석 기반의 틀을 생성하며 화면에 “데모 엔진 생성”으로 표시됩니다.

```bash
npm run build && npm start   # 프로덕션
npm test                     # 단위·서비스 테스트 (vitest)
npm run lint                 # ESLint
npm run typecheck            # 라우트 타입 생성 + tsc
```

### 환경 변수 (`.env.example` 참고, 모두 선택)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ANTHROPIC_API_KEY` | – | 설정 시 Claude로 실제 분석·출제·OCR 수행 |
| `CLASSPICK_AI_MODE` | `auto` | `auto` / `claude` / `demo` |
| `CLASSPICK_AI_MODEL` | `claude-opus-5-5` | 사용할 Claude 모델 |
| `CLASSPICK_AI_EFFORT` | `high` | `low`~`max` (출제 품질과 비용의 균형) |
| `DATABASE_PATH` | `./data/classpick.db` | SQLite(libSQL) 파일 경로 |
| `PAYMENT_PROVIDER` | `mock` | `mock`(테스트 결제) / `toss` |
| `TOSS_SECRET_KEY` | – | 토스페이먼츠 결제 승인용 시크릿 키 |

---

## 3. 아키텍처

```
┌──────────────────────────── Next.js 16 (App Router · Cache Components) ────────────────────────────┐
│                                                                                                     │
│  (marketing)  /  /samples  /pricing  /guide  /terms      ← 정적 프리렌더 (Copy.md 카피 매핑)            │
│  (auth)       /login  /signup                                                                        │
│  /app/*       대시보드 · 생성 마법사 · 자료함 · OCR · 제본 · 분석 · 충전  ← 정적 셸 + Suspense 스트리밍   │
│  (print)      /print/materials/:id  /samples/:slug/print  ← A4 인쇄·PDF 저장 레이아웃                   │
│                                                                                                     │
│  src/proxy.ts  세션 쿠키 없으면 /app·/print → /login (낙관적 검사)                                     │
│                                                                                                     │
│  /api/*  Route Handlers ──► server/services ──► server/db (Drizzle · SQLite)                         │
│                               │                                                                     │
│                               ├─► server/ai/pipeline ──► Claude 엔진 (구조화 출력, 병렬 생성)          │
│                               │                     └──► 데모 엔진 (키 없이 동작)                     │
│                               ├─► server/ingest   TXT · HWPX · DOCX · 텍스트 PDF 추출 (무료)            │
│                               └─► server/export   Material → DocModel → HWPX(OWPML) / DOCX             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 디렉터리

```
src/
├─ app/
│  ├─ (marketing)/        랜딩 · 샘플 · 요금제 · 가이드 · 약관 · 개인정보
│  ├─ (auth)/             로그인 · 회원가입
│  ├─ (print)/            인쇄(PDF) 전용 레이아웃
│  ├─ app/                워크스페이스 (/app/...)
│  ├─ student/            학생 포털 (/student/...)
│  └─ api/                REST 엔드포인트
├─ components/
│  ├─ ui/                 shadcn 스타일 프리미티브 (Radix + Tailwind v4)
│  ├─ marketing/          랜딩 섹션 (Hero 미리보기, 6대 기능, 3단계, 포맷, 요금제, 법적 안내, CTA)
│  ├─ material/           자료 렌더러 (도식화·행간주·문항·OX·어휘·보고서·시험지) — 화면/샘플/인쇄 공용
│  ├─ app/                워크스페이스 (생성 마법사, OCR, 제본, 분석, 충전, 내비게이션)
│  ├─ classroom/          반·배포·성적 분석 (차트, 배포 다이얼로그)
│  └─ student/            학생 포털 (응시 화면, 결과·오답 보기)
├─ lib/                   클라이언트·서버 공용: Zod 스키마, 카탈로그(단가·요금제), 한글 유틸, 샘플 데이터
└─ server/                서버 전용 ("server-only")
   ├─ auth/               scrypt 비밀번호, 세션(토큰 해시 저장), Data Access Layer
   ├─ db/                 Drizzle 스키마 · libSQL 클라이언트(자동 마이그레이션, 네이티브 컴파일 불필요)
   ├─ ai/                 프롬프트, Claude 엔진, 데모 엔진, 파이프라인(후처리)
   ├─ ingest/             파일 → 텍스트
   ├─ export/             DocModel, HWPX 빌더, DOCX 렌더러, 다운로드 응답
   └─ services/           users · points(원장) · materials · billing · classroom(반·배포·응시) · classroom-demo
drizzle/                  SQL 마이그레이션
tests/                    vitest (HWPX/DOCX, 한글 유틸, 데모 엔진, 서비스·원장, 채점·분석, 반·배포 흐름)
```

### 데이터 모델

| 테이블 | 설명 |
|--------|------|
| `users` | 이메일, 이름, 직군, 소속, 요금제, **토큰 잔액**, 체험 계정 여부 |
| `sessions` | 세션 토큰의 SHA-256 해시, 만료 시각 (원본 토큰은 httpOnly 쿠키에만 존재) |
| `materials` | `kind`(passage·exam_report·exam_set·ocr), 원문, 생성 설정, 생성 결과(JSON), 엔진, 사용 토큰 |
| `point_transactions` | 토큰 원장 — 적립·차감·환불을 모두 기록하고 거래 후 잔액을 남김 |
| `payments` | 충전 주문 (mock/toss, pending/paid/failed) |
| `classes` · `class_members` | 선생님의 반(6자리 참여 코드)과 소속 학생 |
| `assignments` | 반에 배포한 시험 — 지문·문항 스냅샷(JSON), 정답 공개 여부, 제한 시간, 응시 중/마감 |
| `submissions` | 학생 답안, 채점 결과, 응시 시간, 문항별 풀이 시간 (시험당 학생 1회) |
| `exam_starts` | 응시 시작 시각 (제한 시간·응시 시간 계산의 기준) |
| `inquiries` · `inquiry_messages` | 문항 질문 대화 (학생·문항마다 하나, 답변 대기/완료, 반 전체 공개, 학생 미확인 답변) |

**토큰 흐름:** 생성 요청 → 트랜잭션으로 선차감(잔액 부족 시 402) → AI 생성 → 실패하면 같은 수량 자동 환불. 다운로드는 무료.

---

## 4. AI 파이프라인

- `read.md`의 Prompt 3-1(작품 도식화 JSON)·3-2(행간주·문항 출제)를 시스템 프롬프트와 유형별 지시문으로 이식했습니다 (`src/server/ai/prompts.ts`).
- **구조화 출력**: 자료 유형별 Zod 스키마(`src/lib/schemas.ts`)를 `output_config.format`으로 전달하고 SDK가 응답을 검증합니다. 선택한 유형은 **병렬**로 생성합니다.
- 기본 모델 `claude-opus-5-5`, adaptive thinking, `effort: high`, 스트리밍 + `finalMessage()`.
- 정책상 거절에 대비해 **서버 측 대체 모델 재시도**(`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)를 켜 두었습니다. `stop_reason`이 `refusal`/`max_tokens`이면 사용자에게 안내하고 토큰을 환불합니다.
- 시스템 프롬프트와 지문 블록에 `cache_control`을 두어 같은 지문의 반복 생성 비용을 줄입니다.
- **결정적 후처리**: 초성은 모델이 아닌 서버가 계산(`toChoseong`), 5지선다는 선지 5개·정답 범위·번호 기호를 정규화, 문항 수는 설정값으로 보정.
- **OCR**: 텍스트 레이어가 있는 문서는 AI 없이 무료 추출, 스캔 PDF·이미지만 Claude 비전으로 전사(토큰 1개).

## 5. 문서 내보내기

- **DocModel**(제목·소제목·문단·표·상자·쪽나눔) 하나를 만들고 포맷별 렌더러가 변환합니다 → 포맷 간 내용 일치.
- **HWPX**: 외부 의존성 없이 OWPML(KS X 6101) 패키지를 직접 생성합니다 (`src/server/export/hwpx/`). 글꼴(함초롬바탕/돋움), 글자·문단 모양, 표(머리행 음영), `<보기>` 상자, 쪽 번호 체계를 포함합니다.
  개발 중 [python-hwpx](https://github.com/airmang/python-hwpx)의 `validate_package` · `validate_editor_open_safety` · OWPML XSD 전체 스키마 검증을 모두 오류·경고 없이 통과하는 것을 확인했습니다. (한컴오피스 실제 열기 테스트는 아직 수행하지 않았습니다.)
- **DOCS**: `docx` 라이브러리로 Word/구글 문서 호환 파일 생성.
- **PDF**: A4 인쇄 전용 레이아웃 페이지(`/print/...`)에서 브라우저 인쇄 → “PDF로 저장”. 도식화·차트가 화면과 동일하게 인쇄됩니다.
- 교사용(정답·해설 포함) / 학생용(문제만) 선택, 자료 하단 **출처 자동 표기** 및 AI 검수 안내 문구 삽입.

## 6. API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/signup` · `/login` · `/logout` · `/guest` | 회원가입(선생님은 토큰 30 지급) · 로그인 · 로그아웃 · 체험 계정(`?role=student`면 학생) |
| GET | `/api/auth/me` | 현재 사용자 |
| GET · POST | `/api/materials` | 자료 목록(`?kind=&q=`) · 지문 자료 생성 |
| GET · DELETE | `/api/materials/:id` | 자료 조회 · 삭제 |
| GET | `/api/materials/:id/export?format=hwpx\|docx&audience=teacher\|student` | 다운로드 |
| POST | `/api/extract` | 파일 → 텍스트 (무료, 스캔본은 `needsOcr`) |
| POST | `/api/ocr` | 스마트 OCR 문서 생성 |
| POST | `/api/exams/analyze` · `/api/exams/compose` | 분석 보고서 · 모음 시험지 |
| POST | `/api/billing/checkout` · `/api/billing/confirm` | 토큰 충전 · 토스페이먼츠 승인 |
| GET | `/api/samples/:slug/export` | 공개 샘플 다운로드 |
| GET · POST | `/api/classes` | (선생님) 반 목록 · 반 만들기 |
| DELETE | `/api/classes/:id/members/:studentId` | (선생님) 학생 내보내기 |
| POST | `/api/assignments` | (선생님) 자료를 반에 시험으로 배포 |
| PATCH · DELETE | `/api/assignments/:id` | (선생님) 응시 마감·재개 · 삭제 |
| POST | `/api/classes/join` | (학생) 참여 코드로 반 참여 |
| POST | `/api/inquiries` | (학생) 제출한 시험의 문항에 질문 (같은 문항이면 기존 대화에 이어서) |
| POST | `/api/inquiries/:id/messages` | 선생님 답변 · 학생 추가 질문 (대화 당사자만) |
| PATCH | `/api/inquiries/:id` | (선생님) 반 전체 공개 여부 |
| POST | `/api/inquiries/read` | (학생) 시험 결과에서 새 답변 확인 처리 |
| POST | `/api/assignments/:id/start` | (학생) 응시 시작 기록 → 경과·남은 시간 |
| POST | `/api/assignments/:id/submit` | (학생) 답안·문항별 풀이 시간 제출 → 서버 채점 |
| GET | `/api/health` | DB·AI 엔진 상태 |

---

## 7. `read.md` 로드맵 대비 현황

- **Phase 1 랜딩페이지** ✅ Prompt 1-1·1-2 구조 + `Copy.md` 카피 전량 매핑 (Hero, 문제/해결, 6대 기능 + 샘플 모달, 3단계, 출력 포맷, 법적 안내, 맺음말).
- **Phase 2 백엔드·AI 파이프라인** ✅ Prompt 3-1·3-2 이식, HWPX custom XML builder, OCR, 분석 보고서, 시험지 제본.
- **Phase 3 법적 고지·결제** ◑ Prompt 4-1 반영 이용약관 초안(법률 검토 필요), 토큰 원장과 테스트 결제 완료. 토스페이먼츠는 서버 승인 API(`confirmTossPayment`)까지 구현되어 있고, 결제창(클라이언트 SDK) 연동이 남아 있습니다.

### 다음 단계 제안
1. 토스페이먼츠 결제위젯 연동 및 정기 구독 결제
2. 한컴오피스에서 HWPX 실제 열기 확인, 학교·학원 고유 양식 템플릿(머리말·로고) 지원
3. PNG 이미지 내보내기(도식화 카드 공유용)
4. 운영 DB 전환(PostgreSQL — Drizzle 스키마 이식), 팀 자료함 공유
5. 실제 지문으로 출제 품질 평가 세트 구축 후 프롬프트·effort 튜닝

> 요금·토큰 단가·요금제 문구는 `src/lib/catalog.ts` 한 곳에서 관리하는 **예시 값**입니다. 실제 정책에 맞게 수정해 주세요.
