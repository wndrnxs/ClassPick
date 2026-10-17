"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, Download, Eye, FileWarning, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { FileDropzone } from "./file-dropzone";
import { InsufficientPointsDialog } from "./insufficient-dialog";

type Item =
  | { key: string; name: string; status: "working" }
  | { key: string; name: string; status: "done"; id: string; text: string; free: boolean }
  | { key: string; name: string; status: "error"; message: string };

export function OcrWorkbench() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [shortfall, setShortfall] = useState<{ required: number; balance: number } | null>(null);

  async function run(files: File[]) {
    setBusy(true);
    const queued = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, status: "working" as const }));
    setItems((prev) => [...queued, ...prev]);
    for (const [i, file] of files.entries()) {
      const key = queued[i].key;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { material } = await api<{ material: { id: string; sourceText: string; pointsSpent: number } }>("/api/ocr", {
          method: "POST",
          body: fd,
        });
        setItems((prev) =>
          prev.map((it) =>
            it.key === key ? { key, name: file.name, status: "done", id: material.id, text: material.sourceText, free: material.pointsSpent === 0 } : it,
          ),
        );
      } catch (e) {
        if (e instanceof ApiError && e.code === "insufficient_points") {
          setShortfall({ required: Number(e.data.required), balance: Number(e.data.balance) });
        }
        setItems((prev) => prev.map((it) => (it.key === key ? { key, name: file.name, status: "error", message: (e as Error).message } : it)));
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <FileDropzone
        multiple
        onFiles={run}
        busy={busy}
        title="스캔한 PDF나 지문 사진을 끌어다 놓으세요"
        hint="여러 파일을 한 번에 올릴 수 있어요 · 스캔 문서는 파일당 토큰 1개, 텍스트 문서는 무료"
      />
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.key} className="rounded-2xl border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-bold">
                  {it.status === "working" && <Loader2 className="size-4 animate-spin text-primary" />}
                  {it.status === "done" && <CheckCircle2 className="size-4 text-emerald" />}
                  {it.status === "error" && <FileWarning className="size-4 text-red-500" />}
                  {it.name}
                  {it.status === "done" && (
                    <span className="text-xs font-semibold text-muted-foreground">{it.free ? "텍스트 추출 · 무료" : "AI OCR · 토큰 1개"}</span>
                  )}
                </p>
                {it.status === "done" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(it.text).then(() => toast.success("텍스트를 복사했어요."))}
                    >
                      <Copy /> 복사
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/materials/${it.id}/export?format=hwpx`}>
                        <Download /> HWPX
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/app/materials/${it.id}`}>
                        <Eye /> 보기
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/app/new?from=${it.id}`}>
                        <Sparkles /> 이 지문으로 자료 만들기
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              {it.status === "done" && (
                <p className="passage mt-3 line-clamp-6 rounded-xl bg-surface p-4 text-sm whitespace-pre-line text-slate-700">{it.text}</p>
              )}
              {it.status === "error" && <p className="mt-2 text-sm text-red-600">{it.message}</p>}
            </li>
          ))}
        </ul>
      )}
      <InsufficientPointsDialog
        open={shortfall !== null}
        onOpenChange={(o) => !o && setShortfall(null)}
        required={shortfall?.required ?? 0}
        balance={shortfall?.balance ?? 0}
      />
    </div>
  );
}
