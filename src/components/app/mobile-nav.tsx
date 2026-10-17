"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { AppNav, AppNavLinks } from "./app-nav";

export function MobileNav({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="메뉴 열기" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <SheetContent side="left">
        <DialogTitle className="sr-only">워크스페이스 메뉴</DialogTitle>
        <Logo href="/app" />
        <div className="mt-2">
          <Suspense fallback={<AppNavLinks />}>
            <AppNav onNavigate={() => setOpen(false)} />
          </Suspense>
        </div>
        <div className="mt-auto">{footer}</div>
      </SheetContent>
    </Dialog>
  );
}
