# 🛠️ 클래스픽(ClassPick) 홈페이지 제작을 위한 AI 프롬프트 패키지 (`read.md`)

이 문서는 국어 전문 AI 플랫폼 **'클래스픽(ClassPick)'**의 랜딩페이지 및 웹 앱 개발을 위해 **v0.dev, Cursor, ChatGPT, Claude, Midjourney/FLUX** 등 다양한 AI 도구에 바로 입력하여 사용할 수 있는 프롬프트 모음집입니다.

---

## 1. 프론트엔드 UI/UX 생성 프롬프트 (v0.dev / Cursor / Bolt.new)

### 🎯 [Prompt 1-1] 랜딩페이지 메인 구조 & Hero Section
```text
Act as a Senior Frontend Developer & UI/UX Designer.
Create a modern, clean, and highly trusted SaaS landing page for 'ClassPick' (클래스픽), an AI platform designed for Korean language teachers and instructors.

Tech Stack:
- Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons.

Design Concept:
- Primary Color: Deep Indigo / Royal Blue (#2563EB or #1E40AF) for trust and educational authority.
- Secondary/Accent: Emerald Green / Amber Gold for badges and CTA emphasis.
- Style: Professional, clean typography, ample whitespace, subtle glassmorphism and soft shadows.

Layout & Component Requirements:
1. Header / Navbar:
   - Logo ("ClassPick" with a sleek book/pen AI icon).
   - Navigation links: "기능 소개", "생성 샘플", "요금제", "이용가이드".
   - Right CTAs: "로그인", "무료로 시작하기" (Button with primary color).
2. Hero Section:
   - Badge: "HWPX · PDF · DOCS 완벽 지원 | 현직 국어 교사 및 명문 학원 강사 활용 중"
   - Headline: "지문 하나로, 수업 준비가 달라집니다." / "국어 수업 교재 제작, 이제 클래스픽으로 3분 만에 완벽하게."
   - Subheadline: "지문 한 편만 입력하면 문제 출제부터 행간주 해설, 작품 도식화, 시험 분석 보고서까지 한 번에 완성하세요."
   - CTA Group: Primary "무료로 첫 수업 자료 만들기" (with Sparkles icon), Secondary "생성 샘플 둘러보기".
   - Interactive Preview Card / Mockup: An interactive preview box showing tabs for (1. 작품 도식화, 2. 행간주 해설, 3. OX/어휘 퀴즈, 4. 시험지 분석 보고서) with a mock download button for HWPX, PDF, DOCS.
```

### 🎯 [Prompt 1-2] 6대 핵심 기능 & 3단계 사용법 (Features & Steps)
```text
Create the Core Features & How-It-Works section for the 'ClassPick' landing page.

Features Grid (6 Cards, 3x2 Layout):
1. 작품 도식화 & 구조 분석 (Structure): Visual summary diagram of story/poem, plot flow, character relationships.
2. 행간주 & 구절별 정밀 해설 (Annotation): Deep commentary per line/stanza with exam focal points.
3. 다채로운 문제 은행 & OX·어휘 퀴즈 (Questions & Quiz): 5-choice, short answer, OX quizzes, initial consonant vocabulary games.
4. 시험지 구조 및 난이도 분석 보고서 (Exam Analysis): Exam paper analysis report with difficulty distribution, genre ratio, and parent-consultation guidelines.
5. 스캔 문서 스마트 OCR 변환 (Smart OCR): Converts PDF/images into editable HWPX texts cleanly.
6. 여러 지문 모음 시험지 제본 (Multi-Passage Test): Combine multiple passages into a single structured test paper.

Design Details for Feature Cards:
- Hover effects: subtle top border glow and border-primary/20 transition.
- Include a "자세히 보기" or sample preview modal trigger on each card.

How-It-Works Section (Horizontal 3-Step Flow):
- Step 1: 지문 입력 및 설정 (Paste text or upload PDF/Scan)
- Step 2: 자료 유형 선택 (Select Structure, Annotation, Quiz, Report)
- Step 3: 포맷 선택 및 다운로드 (Download editable HWPX or print-ready PDF)
```

---

## 2. 디자인 & 비주얼 자산 생성 프롬프트 (Midjourney / DALL-E / FLUX)

### 🎨 [Prompt 2-1] 메인 대시보드 및 UI 목업 3D 그래픽
```text
A modern 3D isometric illustration of a sleek digital educational workspace for Korean language teachers. Clean UI windows floating softly with educational diagrams, Korean text analysis charts, character relationship maps, and HWPX/PDF document badges. Soft blue and purple ambient lighting, white background, minimalist clay-morphism style, 8k resolution, ultra-clean --ar 16:9 --v 6.0
```

### 🎨 [Prompt 2-2] 국어 작품 도식화 인포그래픽 아이콘
```text
Minimalist vector icon set for Korean literature analysis app: a glowing AI quill writing on a structured flow-chart diagram, line-by-line annotated poem document, true/false quiz checkbox, exam report with radar charts, and HWPX file export icon. Clean lines, indigo blue and emerald green palette, isometric perspective, isolated on transparent background --ar 1:1
```

---

## 3. 백엔드 AI 파이프라인 개발 프롬프트 (Claude 3.5 Sonnet / GPT-4o)

### 🤖 [Prompt 3-1] 국어 지문 분석 및 '작품 도식화' JSON 생성
```text
You are an expert Korean language test creator and curriculum analyst.
Analyze the provided Korean reading passage (poem, novel, or non-fiction) and output a structured JSON object for classroom diagramming.

Input Passage:
[INSERT PASSAGE HERE]

Output JSON Schema:
{
  "title": "작품명",
  "author": "작가명",
  "genre": "갈래",
  "basic_info": {
    "point_of_view": "시점/화자",
    "background": "시대적/공간적 배경",
    "theme": "주제"
  },
  "structure_flow": [
    { "stage": "발단/1연", "summary": "핵심 내용", "key_symbol": "주요 상징 및 의미" }
  ],
  "character_relation": [
    { "from": "인물A", "to": "인물B", "relation": "갈등/협력", "description": "갈등 원인" }
  ],
  "exam_points": ["출제 포인트 1", "출제 포인트 2", "출제 포인트 3"]
}

Ensure high academic accuracy adhering to Korean High School Curriculum standards.
```

### 🤖 [Prompt 3-2] 행간주 해설 및 문제 출제 엔진
```text
You are an AI assistant specialized in Korean language pedagogy.
Given a Korean literature or reading comprehension passage, generate:

1. Line-by-Line Annotation (행간주 해설):
   - Highlight key rhetorical devices, metaphors, grammar points, and context.
2. 5-Choice Multiple Questions (5지선다 2문항):
   - Q1: 작품의 표현상 특징 및 효과
   - Q2: 구절의 맥락적 의미 파악
   - Include: Passage, Question, Options (①~⑤), Correct Answer, Detailed Explanation.
3. OX Quiz (3문항):
   - Tricky misconceptions for inner school exams (내신 오개념 파악용).

Format output in clean Markdown with HWPX-ready table tags.
```

---

## 4. 저작권 & 법적 안전성 검토 프롬프트 (Legal AI Prompt)

### ⚖️ [Prompt 4-1] 서비스 이용약관 및 저작권 준수 가이드 생성
```text
당신은 대한민국 교육 및 지적재산권 전문 법률 자문 AI입니다.
국어 교사 및 학원 강사 대상 AI 교재 제작 서비스 '클래스픽(ClassPick)'의 이용약관 내 [저작권 및 교육 목적 사용 관련 조항]을 작성해 주세요.

다음 사항을 반영할 것:
1. 저작권법 제25조(학교 교육 목적 등에의 이용) 및 개인 학원 수업 준비 활용 범위 안내.
2. 사용자가 업로드한 지문의 원저작권은 원저작자에게 있으며, 서비스는 2차적 변형/분석 도구만을 제공함.
3. 교재 하단 원문 출처 자동 명시 기능 준수 권고.
4. AI 생성 문제 및 해설의 최종 검수 책임은 담당 선생님에게 있음을 알리는 고지 문구.
5. 법적 분쟁 예방을 위한 명확하고 정중한 법률 고지문 작성.
```

---

## 5. 단계별 개발 실행 가이드라인 (Developer Roadmap)

1. **Phase 1: 랜딩페이지 구축 (1~2일)**
   - `Prompt 1-1`, `Prompt 1-2`를 **v0.dev** 또는 **Cursor**에 입력하여 메인 랜딩페이지 UI 컴포넌트 생성.
   - `copy.md` 카피라이팅 텍스트를 랜딩페이지 각 섹션에 매핑.
2. **Phase 2: 백엔드 API & AI 파이프라인 구축 (3~5일)**
   - `Prompt 3-1`, `Prompt 3-2`를 FastAPI/Node.js 백엔드 서비스의 LLM 프롬프트 파이프라인으로 이식.
   - HWPX 파싱 라이브러리(python-hwpx 또는 custom XML builder) 연결.
3. **Phase 3: 법적 고지 & 베타 오픈 (2일)**
   - `Prompt 4-1` 생성 결과물을 이용약관 및 푸터(Footer) 영역에 배치하여 법적 안전성 확보.
   - 연필/포인트 티켓 결제 시스템(Toss Payments / Portone) 연결 후 배포.
