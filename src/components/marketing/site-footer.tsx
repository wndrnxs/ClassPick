import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "서비스",
    links: [
      { href: "/#features", label: "기능 소개" },
      { href: "/samples", label: "생성 샘플" },
      { href: "/pricing", label: "요금제" },
      { href: "/guide", label: "이용가이드" },
    ],
  },
  {
    title: "시작하기",
    links: [
      { href: "/signup", label: "무료 회원가입" },
      { href: "/login", label: "로그인" },
      { href: "/app", label: "내 워크스페이스" },
    ],
  },
  {
    title: "정책",
    links: [
      { href: "/terms", label: "이용약관" },
      { href: "/terms#copyright", label: "저작권 및 교육 목적 이용 안내" },
      { href: "/privacy", label: "개인정보처리방침" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_2fr]">
        <div className="space-y-4">
          <div className="[&_span]:!text-white [&_.text-primary]:!text-blue-400">
            <Logo />
          </div>
          <p className="max-w-sm text-sm leading-relaxed">
            국어 교사와 강사를 위한 AI 수업 자료 플랫폼. 지문 하나로 작품 도식화, 행간주 해설, 문제 은행, 시험 분석 보고서까지.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs leading-relaxed sm:px-6">
          <p>
            클래스픽은 교사·강사의 정당한 교육 목적 및 수업 준비를 돕는 도구입니다. 사용자가 입력한 지문의 저작권은 원저작자에게 있으며, 교재
            하단 출처 표기와 개인 수업·학원 내부용 사용 범위 준수를 권장합니다. AI 생성 문항과 해설의 최종 검수 책임은 담당 선생님께 있습니다.
          </p>
          <p>© {"2026"} ClassPick. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
