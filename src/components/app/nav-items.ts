export const APP_NAV = [
  { href: "/app", label: "대시보드", icon: "home", exact: true },
  { href: "/app/new", label: "새 자료 만들기", icon: "sparkles" },
  { href: "/app/materials", label: "내 자료함", icon: "folder" },
  { href: "/app/ocr", label: "스마트 OCR", icon: "scan" },
  { href: "/app/exam-builder", label: "모음 시험지 제본", icon: "book" },
  { href: "/app/exam-analysis", label: "시험지 분석 보고서", icon: "chart" },
  { href: "/app/classes", label: "반 · 학생 관리", icon: "users" },
  { href: "/app/assignments", label: "배포한 시험 · 성적", icon: "clipboard" },
  { href: "/app/billing", label: "토큰 충전", icon: "coins" },
] as const;
