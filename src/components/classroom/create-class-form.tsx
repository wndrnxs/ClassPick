"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

export function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const res = await api<{ class: { joinCode: string } }>("/api/classes", { method: "POST", json: { name } });
            toast.success(`반을 만들었어요. 참여 코드: ${res.class.joinCode}`);
            setName("");
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 2학년 3반 / 고2 내신반 A" aria-label="반 이름" className="sm:w-72" />
      <Button type="submit" disabled={pending || !name.trim()}>
        <Plus /> 반 만들기
      </Button>
    </form>
  );
}
