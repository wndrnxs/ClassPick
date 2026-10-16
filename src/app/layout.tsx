import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "클래스픽 ClassPick — 지문 하나로, 수업 준비가 달라집니다",
    template: "%s | 클래스픽 ClassPick",
  },
  description:
    "지문 한 편만 입력하면 문제 출제부터 행간주 해설, 작품 도식화, 시험 분석 보고서까지 한 번에. 국어 교사·강사를 위한 AI 수업 자료 플랫폼. HWPX · PDF · DOCS 지원.",
  applicationName: "ClassPick",
  keywords: ["국어", "수업 자료", "HWPX", "문제 출제", "행간주", "작품 도식화", "국어 교사", "학원 강사", "AI"],
  openGraph: {
    title: "클래스픽 ClassPick",
    description: "국어 수업 교재 제작, 이제 클래스픽으로 3분 만에 완벽하게.",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
