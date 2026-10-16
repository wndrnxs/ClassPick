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

그 밖에: 랜딩페이지(인터랙티브 미리보기·실제 샘플 다운로드), 생성 샘플 갤러리, 요금제, 이용가이드, 이용약관(저작권법 제25조·제35조의5·제37조 반영 초안), 회원가입/로그인/**가입 없는 체험 계정**, 연필(포인트) 원장과 충전.

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
│  └─ api/                REST 엔드포인트
├─ components/
│  ├─ ui/                 shadcn 스타일 프리미티브 (Radix + Tailwind v4)
│  ├─ marketing/          랜딩 섹션 (Hero 미리보기, 6대 기능, 3단계, 포맷, 요금제, 법적 안내, CTA)
│  ├─ material/           자료 렌더러 (도식화·행간주·문항·OX·어휘·보고서·시험지) — 화면/샘플/인쇄 공용
│  └─ app/                워크스페이스 (생성 마법사, OCR, 제본, 분석, 충전, 내비게이션)
├─ lib/                   클라이언트·서버 공용: Zod 스키마, 카탈로그(단가·요금제), 한글 유틸, 샘플 데이터
└─ server/                서버 전용 ("server-only")
   ├─ auth/               scrypt 비밀번호, 세션(토큰 해시 저장), Data Access Layer
   ├─ db/                 Drizzle 스키마 · libSQL 클라이언트(자동 마이그레이션, 네이티브 컴파일 불필요)
   ├─ ai/                 프롬프트, Claude 엔진, 데모 엔진, 파이프라인(후처리)
   ├─ ingest/             파일 → 텍스트
   ├─ export/             DocModel, HWPX 빌더, DOCX 렌더러, 다운로드 응답
   └─ services/           users · points(원장) · materials · billing
drizzle/                  SQL 마이그레이션
tests/                    vitest (HWPX/DOCX, 한글 유틸, 데모 엔진, 서비스·원장)
```

### 데이터 모델

| 테이블 | 설명 |
|--------|------|
| `users` | 이메일, 이름, 직군, 소속, 요금제, **연필 잔액**, 체험 계정 여부 |
| `sessions` | 세션 토큰의 SHA-256 해시, 만료 시각 (원본 토큰은 httpOnly 쿠키에만 존재) |
| `materials` | `kind`(passage·exam_report·exam_set·ocr), 원문, 생성 설정, 생성 결과(JSON), 엔진, 사용 연필 |
| `point_transactions` | 연필 원장 — 적립·차감·환불을 모두 기록하고 거래 후 잔액을 남김 |
| `payments` | 충전 주문 (mock/toss, pending/paid/failed) |

**연필 흐름:** 생성 요청 → 트랜잭션으로 선차감(잔액 부족 시 402) → AI 생성 → 실패하면 같은 수량 자동 환불. 다운로드는 무료.

---

## 4. AI 파이프라인

- `read.md`의 Prompt 3-1(작품 도식화 JSON)·3-2(행간주·문항 출제)를 시스템 프롬프트와 유형별 지시문으로 이식했습니다 (`src/server/ai/prompts.ts`).
- **구조화 출력**: 자료 유형별 Zod 스키마(`src/lib/schemas.ts`)를 `output_config.format`으로 전달하고 SDK가 응답을 검증합니다. 선택한 유형은 **병렬**로 생성합니다.
- 기본 모델 `claude-opus-5-5`, adaptive thinking, `effort: high`, 스트리밍 + `finalMessage()`.
- 정책상 거절에 대비해 **서버 측 대체 모델 재시도**(`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`)를 켜 두었습니다. `stop_reason`이 `refusal`/`max_tokens`이면 사용자에게 안내하고 연필을 환불합니다.
- 시스템 프롬프트와 지문 블록에 `cache_control`을 두어 같은 지문의 반복 생성 비용을 줄입니다.
- **결정적 후처리**: 초성은 모델이 아닌 서버가 계산(`toChoseong`), 5지선다는 선지 5개·정답 범위·번호 기호를 정규화, 문항 수는 설정값으로 보정.
- **OCR**: 텍스트 레이어가 있는 문서는 AI 없이 무료 추출, 스캔 PDF·이미지만 Claude 비전으로 전사(연필 1자루).

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
| POST | `/api/auth/signup` · `/login` · `/logout` · `/guest` | 회원가입(연필 30 지급) · 로그인 · 로그아웃 · 체험 계정 |
| GET | `/api/auth/me` | 현재 사용자 |
| GET · POST | `/api/materials` | 자료 목록(`?kind=&q=`) · 지문 자료 생성 |
| GET · DELETE | `/api/materials/:id` | 자료 조회 · 삭제 |
| GET | `/api/materials/:id/export?format=hwpx\|docx&audience=teacher\|student` | 다운로드 |
| POST | `/api/extract` | 파일 → 텍스트 (무료, 스캔본은 `needsOcr`) |
| POST | `/api/ocr` | 스마트 OCR 문서 생성 |
| POST | `/api/exams/analyze` · `/api/exams/compose` | 분석 보고서 · 모음 시험지 |
| POST | `/api/billing/checkout` · `/api/billing/confirm` | 연필 충전 · 토스페이먼츠 승인 |
| GET | `/api/samples/:slug/export` | 공개 샘플 다운로드 |
| GET | `/api/health` | DB·AI 엔진 상태 |

---

## 7. `read.md` 로드맵 대비 현황

- **Phase 1 랜딩페이지** ✅ Prompt 1-1·1-2 구조 + `Copy.md` 카피 전량 매핑 (Hero, 문제/해결, 6대 기능 + 샘플 모달, 3단계, 출력 포맷, 법적 안내, 맺음말).
- **Phase 2 백엔드·AI 파이프라인** ✅ Prompt 3-1·3-2 이식, HWPX custom XML builder, OCR, 분석 보고서, 시험지 제본.
- **Phase 3 법적 고지·결제** ◑ Prompt 4-1 반영 이용약관 초안(법률 검토 필요), 연필 원장과 테스트 결제 완료. 토스페이먼츠는 서버 승인 API(`confirmTossPayment`)까지 구현되어 있고, 결제창(클라이언트 SDK) 연동이 남아 있습니다.

### 다음 단계 제안
1. 토스페이먼츠 결제위젯 연동 및 정기 구독 결제
2. 한컴오피스에서 HWPX 실제 열기 확인, 학교·학원 고유 양식 템플릿(머리말·로고) 지원
3. PNG 이미지 내보내기(도식화 카드 공유용)
4. 운영 DB 전환(PostgreSQL — Drizzle 스키마 이식), 팀 자료함 공유
5. 실제 지문으로 출제 품질 평가 세트 구축 후 프롬프트·effort 튜닝

> 요금·연필 단가·요금제 문구는 `src/lib/catalog.ts` 한 곳에서 관리하는 **예시 값**입니다. 실제 정책에 맞게 수정해 주세요.
