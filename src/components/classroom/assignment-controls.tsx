"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Lock, LockOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";

export function AssignmentControls({ id, status }: { id: string; status: "open" | "closed" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>, msg: string, after?: () => void) =>
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        if (after) after();
        else router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <Button variant="outline" disabled={pending} onClick={() => run(() => api(`/api/assignments/${id}`, { method: "PATCH", json: { status: "closed" } }), "응시를 마감했어요.")}>
          <Lock /> 응시 마감
        </Button>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => run(() => api(`/api/assignments/${id}`, { method: "PATCH", json: { status: "open" } }), "응시를 다시 열었어요.")}>
          <LockOpen /> 다시 열기
        </Button>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" aria-label="배포 취소">
            <Trash2 className="text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배포를 취소할까요?</DialogTitle>
            <DialogDescription>학생 화면에서 시험이 사라지고, 학생들의 응시 기록도 함께 삭제됩니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">돌아가기</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(() => api(`/api/assignments/${id}`, { method: "DELETE" }), "배포를 취소했어요.", () => {
                  router.push("/app/assignments");
                  router.refresh();
                })
              }
            >
              배포 취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
