import { Suspense } from "react";

import { AppNav, AppNavLinks } from "@/components/app/app-nav";
import { MobileNav } from "@/components/app/mobile-nav";
import { SidebarAccount, SidebarAccountSkeleton, TopbarPoints } from "@/components/app/sidebar-account";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r bg-white px-4 py-5 lg:flex">
        <Logo href="/app" className="px-2" />
        <Suspense fallback={<AppNavLinks />}>
          <AppNav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<SidebarAccountSkeleton />}>
            <SidebarAccount />
          </Suspense>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-1">
            <MobileNav
              footer={
                <Suspense fallback={<SidebarAccountSkeleton />}>
                  <SidebarAccount />
                </Suspense>
              }
            />
            <span className="lg:hidden">
              <Logo href="/app" />
            </span>
          </div>
          <Suspense fallback={<Skeleton className="h-8 w-28 rounded-full" />}>
            <TopbarPoints />
          </Suspense>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
