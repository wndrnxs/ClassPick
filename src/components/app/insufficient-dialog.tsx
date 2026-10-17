"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function InsufficientPointsDialog({
  open,
  onOpenChange,
  required,
  balance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: number;
  balance: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-amber-soft text-amber-600">
            <Coins className="size-5" />
          </span>
          <DialogTitle>토큰이 부족해요</DialogTitle>
          <DialogDescription>
            이 작업에는 토큰 {required}개가 필요하지만 현재 {balance}개를 보유하고 있어요. 토큰을 충전하거나 자료 유형을 줄여 보세요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            돌아가기
          </Button>
          <Button asChild>
            <Link href="/app/billing">토큰 충전하기</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
