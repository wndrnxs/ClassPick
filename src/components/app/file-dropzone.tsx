"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export const ACCEPT_DOCS = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.hwpx,.docx,.txt,.md";

export function FileDropzone({
  onFiles,
  busy = false,
  multiple = false,
  accept = ACCEPT_DOCS,
  title = "파일을 끌어다 놓거나 클릭해서 선택하세요",
  hint = "PDF · 이미지(JPG/PNG) · HWPX · DOCX · TXT, 최대 15MB",
  className,
}: {
  onFiles: (files: File[]) => void;
  busy?: boolean;
  multiple?: boolean;
  accept?: string;
  title?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handle(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-busy={busy}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy) handle(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white px-6 py-10 text-center transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        dragging ? "border-primary bg-secondary/60" : "border-slate-300 hover:border-primary/60 hover:bg-secondary/30",
        busy && "cursor-wait opacity-70",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        {busy ? <Loader2 className="size-7 animate-spin" /> : <FileUp className="size-7" />}
      </span>
      <div>
        <p className="font-bold text-slate-800">{busy ? "파일을 처리하고 있습니다…" : title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
