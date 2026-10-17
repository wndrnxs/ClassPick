import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { StudentMenu } from "@/components/student/student-menu";
import { StudentNav, StudentNavLinks } from "@/components/student/student-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStudent } from "@/server/auth/dal";

async function StudentAccount() {
  const user = await requireStudent();
  return <StudentMenu name={user.name} email={user.email} isGuest={user.isGuest} />;
}

/** 학생 포털: 메뉴가 둘뿐이라 사이드바 없이 상단 탭으로 구성합니다. (모바일에서는 탭이 헤더 아래 줄로 내려감) */
export default function StudentLayout({ children }: LayoutProps<"/student">) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <span className="flex items-center gap-2">
              <Logo href="/student" />
              <span className="rounded-full bg-emerald-soft px-2 py-0.5 text-[11px] font-bold text-emerald-700">학생</span>
            </span>
            <Suspense fallback={<StudentNavLinks className="hidden sm:flex" />}>
              <StudentNav className="hidden sm:flex" />
            </Suspense>
          </div>
          <Suspense fallback={<Skeleton className="h-9 w-28 rounded-full" />}>
            <StudentAccount />
          </Suspense>
        </div>
        <div className="border-t px-2 py-1.5 sm:hidden">
          <Suspense fallback={<StudentNavLinks />}>
            <StudentNav />
          </Suspense>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 lg:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
