"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";

export function StudentMenu({ name, email, isGuest }: { name: string; email: string; isGuest: boolean }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 transition outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-primary text-sm font-bold text-white">
          {name.slice(0, 1)}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-bold sm:block">{name}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block font-bold">{name} 학생</span>
          <span className="block text-xs font-normal text-muted-foreground">{isGuest ? "체험 계정으로 이용 중" : email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isGuest && (
          <DropdownMenuItem asChild>
            <Link href="/signup">
              <UserRound /> 정식 회원가입
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> 로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
