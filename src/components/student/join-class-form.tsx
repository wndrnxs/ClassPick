"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

/** 선생님이 알려 준 6자리 참여 코드로 반에 들어갑니다. */
export function JoinClassForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const valid = /^[A-Z0-9]{6}$/.test(code);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const res = await api<{ class: { name: string } }>("/api/classes/join", { method: "POST", json: { code } });
            toast.success(`'${res.class.name}'에 참여했어요.`);
            setCode("");
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
        placeholder="참여 코드 6자리"
        aria-label="반 참여 코드"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="min-w-0 flex-1 font-mono text-base tracking-[0.2em] uppercase placeholder:font-sans placeholder:tracking-normal"
      />
      <Button type="submit" disabled={pending || !valid}>
        <LogIn /> 참여
      </Button>
    </form>
  );
}
