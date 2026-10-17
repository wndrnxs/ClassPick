/**
 * 생성 샘플: 시험지 구조 및 난이도 분석 보고서 (가상의 시험지 예시)
 */
import type { ExamReport } from "@/lib/schemas";

export const sampleExamReport: ExamReport = {
  exam_title: "2026학년도 1학기 중간고사 고1 국어 (예시)",
  overview:
    "전체 15문항으로 문학 8문항, 독서 4문항, 문법 3문항이 출제되었습니다. 교과서 수록 작품을 중심으로 하되 외부 지문 1편(현대시)이 <보기>와 함께 제시되어 작품 간 비교 감상 능력을 요구했습니다. 고난도 문항은 문학의 외적 준거 감상과 문법의 음운 변동 적용에 집중되었습니다.",
  questions: [
    { number: 1, area: "문학", genre: "현대시", source: "진달래꽃", type: "표현상 특징", difficulty: "하", point: "수미상관 구조 파악" },
    { number: 2, area: "문학", genre: "현대시", source: "진달래꽃", type: "구절의 의미", difficulty: "중", point: "반어법의 효과" },
    { number: 3, area: "문학", genre: "현대시", source: "진달래꽃 + 외부 지문", type: "작품 비교", difficulty: "상", point: "이별의 정한 전통 비교" },
    { number: 4, area: "문학", genre: "현대소설", source: "운수 좋은 날", type: "서술상 특징", difficulty: "하", point: "배경 묘사의 기능" },
    { number: 5, area: "문학", genre: "현대소설", source: "운수 좋은 날", type: "인물 심리", difficulty: "중", point: "행운과 불안의 교차" },
    { number: 6, area: "문학", genre: "현대소설", source: "운수 좋은 날", type: "외적 준거 감상", difficulty: "상", point: "사회·역사적 맥락 적용" },
    { number: 7, area: "문학", genre: "고전시가", source: "가시리", type: "시어의 의미", difficulty: "중", point: "후렴구의 기능" },
    { number: 8, area: "문학", genre: "고전시가", source: "가시리", type: "표현상 특징", difficulty: "하", point: "3음보 율격" },
    { number: 9, area: "독서", genre: "인문", source: "언어의 본질", type: "세부 정보", difficulty: "하", point: "핵심 개념 일치 여부" },
    { number: 10, area: "독서", genre: "인문", source: "언어의 본질", type: "<보기> 적용", difficulty: "중", point: "사례의 개념 분류" },
    { number: 11, area: "독서", genre: "과학", source: "외부 지문", type: "추론", difficulty: "상", point: "원리의 적용과 추론" },
    { number: 12, area: "독서", genre: "과학", source: "외부 지문", type: "세부 정보", difficulty: "중", point: "과정 순서 파악" },
    { number: 13, area: "문법", genre: "음운", source: "교과서 단원", type: "개념 적용", difficulty: "상", point: "음운 변동 유형 판별" },
    { number: 14, area: "문법", genre: "음운", source: "교과서 단원", type: "개념 이해", difficulty: "중", point: "자음 체계" },
    { number: 15, area: "문법", genre: "단어", source: "교과서 단원", type: "탐구", difficulty: "중", point: "품사 분류 기준" },
  ],
  difficulty_comment:
    "중 난도 문항이 절반 가까이를 차지해 변별력은 '상' 문항 4개에서 결정되는 구조입니다. 상 문항은 모두 지문 밖의 정보(외부 지문, <보기>, 문법 개념)를 적용해야 하는 유형이었습니다.",
  key_findings: [
    "교과서 수록 작품의 핵심 표현법(반어, 수미상관)은 하~중 난도로 반드시 출제됨",
    "외부 지문 비교 감상 문항이 문학 최고난도 문항으로 출제됨",
    "독서는 개념 일치형보다 <보기> 적용형의 비중이 증가",
    "문법은 음운 변동의 '적용' 문항에서 오답률이 높을 것으로 예상",
  ],
  study_strategies: [
    { area: "문학", strategy: "수업 작품별 표현법·주제를 정리한 뒤, 같은 주제의 외부 작품과 비교하는 연습을 병행합니다." },
    { area: "독서", strategy: "문단별 핵심 개념을 한 줄로 요약하고, <보기> 사례를 개념에 대응시키는 훈련을 합니다." },
    { area: "문법", strategy: "음운 변동을 '조건-결과' 표로 정리하고 단어 적용 문제를 반복합니다." },
  ],
  consultation_guide: [
    "이번 시험은 교과서 작품의 기본 개념 이해만으로도 70% 이상 해결 가능한 구성이었습니다.",
    "상위권 변별은 외부 지문 비교와 문법 적용 문항에서 이루어졌으므로, 다음 시험 대비 시 해당 유형을 집중 보완할 예정입니다.",
    "가정에서는 작품을 읽고 '주제를 한 문장으로 말해 보기' 활동을 함께해 주시면 도움이 됩니다.",
  ],
};
