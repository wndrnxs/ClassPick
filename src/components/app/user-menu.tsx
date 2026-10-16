"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";

export function UserMenu({ name, email, isGuest }: { name: string; email: string; isGuest: boolean }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-bold text-white">
          {name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{name} 선생님</span>
          <span className="block truncate text-xs text-muted-foreground">{isGuest ? "체험 계정" : email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>{isGuest ? "체험 계정으로 이용 중" : email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isGuest && (
          <DropdownMenuItem asChild>
            <Link href="/signup">
              <UserRound /> 정식 회원가입
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/app/billing">
            <Pencil /> 연필 충전 · 사용 내역
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> 로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
