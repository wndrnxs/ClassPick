"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Bold, Eraser, Square, Underline } from "lucide-react";

import { domToRuns, htmlToRuns, markupToEditorHtml, pointAt } from "@/lib/rich-html";
import { clearMarks, marksIn, runsToMarkup, spliceRich, stripRich, toggleMark, type RichMark } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/** 지문 편집기: 붙여넣을 때 굵게·밑줄·네모 박스를 살리고, 나머지 서식(글꼴·색·크기)은 버립니다. */
export function RichPassageEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  "aria-label": ariaLabel,
}: {
  /** 서식 표기(<b>·<u>·<box>)가 들어 있는 지문 */
  value: string;
  onChange: (markup: string) => void;
  placeholder?: string;
  className?: string;
  /** 입력 영역 크기 등 (기본: 최소 높이 360px) */
  editorClassName?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 편집기가 마지막으로 알린 값 — 바깥에서 값이 바뀐 경우(예시 지문·파일 가져오기)에만 다시 그립니다.
  const emitted = useRef<string | null>(null);
  const history = useRef<{ stack: string[]; index: number; at: number }>({ stack: [], index: -1, at: 0 });
  const [active, setActive] = useState<Record<RichMark, boolean>>({ b: false, u: false, box: false });

  useEffect(() => {
    const el = ref.current;
    if (!el || value === emitted.current) return;
    el.innerHTML = markupToEditorHtml(value);
    emitted.current = value;
    history.current = { stack: [value], index: 0, at: 0 };
  }, [value]);

  // 브라우저 메뉴의 「실행 취소」와 서식 명령 (React의 onBeforeInput은 inputType을 주지 않아 직접 등록)
  const onNativeBeforeInput = useEffectEvent((e: InputEvent) => {
    if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
      e.preventDefault();
      undoRedo(e.inputType === "historyRedo" ? 1 : -1);
    } else if (e.inputType.startsWith("format")) {
      e.preventDefault(); // 서식은 단추·단축키로만
    }
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: InputEvent) => onNativeBeforeInput(e);
    el.addEventListener("beforeinput", handler);
    return () => el.removeEventListener("beforeinput", handler);
  }, []);

  /** 현재 내용과 선택 영역(글자 번호) */
  function read() {
    const el = ref.current!;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0) : null;
    const points = range ? [{ node: range.startContainer, offset: range.startOffset }, { node: range.endContainer, offset: range.endOffset }] : [];
    const { runs, points: at, length } = domToRuns(el, { pre: true, points });
    const markup = runsToMarkup(runs);
    const start = range && at[0] >= 0 ? at[0] : length;
    const end = range && at[1] >= 0 ? at[1] : start;
    return { markup, start, end, hasSelection: !!range };
  }

  function emit(markup: string, timeStamp: number, forceSnapshot: boolean) {
    emitted.current = markup;
    const h = history.current;
    if (h.stack[h.index] !== markup) {
      // 이어서 타이핑한 내용은 1초 단위로 묶어 한 번에 되돌립니다.
      if (forceSnapshot || timeStamp - h.at > 1000 || h.index < 0) {
        h.stack = [...h.stack.slice(0, h.index + 1), markup].slice(-200);
        h.index = h.stack.length - 1;
      } else {
        h.stack[h.index] = markup;
      }
      h.at = forceSnapshot ? 0 : timeStamp;
    }
    onChange(markup);
  }

  /** 내용을 새로 그리고 커서·선택을 되돌립니다. */
  function render(markup: string, start: number, end = start) {
    const el = ref.current!;
    el.innerHTML = markupToEditorHtml(markup);
    const sel = window.getSelection();
    if (!sel) return;
    const a = pointAt(el, start);
    const b = pointAt(el, end);
    const range = document.createRange();
    range.setStart(a.node, a.offset);
    range.setEnd(b.node, b.offset);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function apply(next: string, start: number, end: number, timeStamp: number) {
    render(next, start, end);
    emit(next, timeStamp, true);
    refreshActive();
  }

  function format(mark: RichMark | "clear", timeStamp: number) {
    ref.current?.focus();
    const { markup, start, end } = read();
    if (start === end) return;
    apply(mark === "clear" ? clearMarks(markup, start, end) : toggleMark(markup, start, end, mark), start, end, timeStamp);
  }

  function undoRedo(step: -1 | 1) {
    const h = history.current;
    const target = h.index + step;
    if (target < 0 || target >= h.stack.length) return;
    const before = stripRich(h.stack[h.index]);
    h.index = target;
    const next = h.stack[target];
    const after = stripRich(next);
    // 바뀐 곳 끝에 커서를 둡니다.
    let p = 0;
    while (p < before.length && p < after.length && before[p] === after[p]) p++;
    let q = 0;
    while (q < before.length - p && q < after.length - p && before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
    render(next, after.length - q);
    emitted.current = next;
    h.at = 0;
    onChange(next);
  }

  function refreshActive() {
    if (!ref.current) return;
    const { markup, start, end, hasSelection } = read();
    setActive(hasSelection ? marksIn(markup, start, end) : { b: false, u: false, box: false });
  }

  function insert(html: string, text: string, timeStamp: number) {
    const runs = html ? htmlToRuns(html) : [{ text: text.replace(/\r\n?/g, "\n") }];
    if (!runs.length) return;
    const { markup, start, end } = read();
    const next = spliceRich(markup, start, end, runs);
    const caret = start + runs.reduce((n, r) => n + r.text.length, 0);
    apply(next, caret, caret, timeStamp);
  }

  const tools: { key: RichMark | "clear"; label: string; icon: typeof Bold; shortcut?: string }[] = [
    { key: "b", label: "굵게", icon: Bold, shortcut: "Ctrl+B" },
    { key: "u", label: "밑줄", icon: Underline, shortcut: "Ctrl+U" },
    { key: "box", label: "네모 박스", icon: Square },
    { key: "clear", label: "서식 지우기", icon: Eraser },
  ];
  const empty = stripRich(value).length === 0;

  return (
    <div className={cn("rounded-lg border border-input bg-background shadow-xs transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/20", className)}>
      <div role="toolbar" aria-label="지문 서식" className="flex flex-wrap items-center gap-1 border-b bg-surface/70 px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            title={t.shortcut ? `${t.label} (${t.shortcut})` : t.label}
            aria-label={t.label}
            aria-pressed={t.key === "clear" ? undefined : active[t.key]}
            // 단추를 눌러도 편집기의 선택 영역이 풀리지 않도록
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => format(t.key, e.timeStamp)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-slate-900",
              t.key !== "clear" && active[t.key] && "bg-white text-primary shadow-xs",
            )}
          >
            <t.icon className="size-4" />
            <span className={cn(t.key === "clear" ? "hidden sm:inline" : "sr-only sm:not-sr-only")}>{t.label}</span>
          </button>
        ))}
        <span className="ml-auto hidden text-[11px] text-muted-foreground md:inline">글자를 선택하고 단추를 누르세요 · 붙여넣으면 굵게·밑줄·박스가 유지돼요</span>
      </div>
      <div className="relative">
        {empty && placeholder && (
          <p aria-hidden className="passage pointer-events-none absolute inset-x-0 top-0 px-3 py-2.5 text-[15px] whitespace-pre-line text-muted-foreground/70">
            {placeholder}
          </p>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          className={cn(
            "passage max-h-[70vh] min-h-[360px] resize-y overflow-auto px-3 py-2.5 text-[15px] whitespace-pre-wrap text-slate-900 outline-none",
            editorClassName,
          )}
          onInput={(e) => {
            emit(read().markup, e.timeStamp, false);
          }}
          onPaste={(e) => {
            e.preventDefault();
            insert(e.clipboardData.getData("text/html"), e.clipboardData.getData("text/plain"), e.timeStamp);
          }}
          onDrop={(e) => {
            // 끌어다 놓은 글도 붙여넣기와 같은 규칙으로 정리합니다.
            e.preventDefault();
            const html = e.dataTransfer.getData("text/html");
            const text = e.dataTransfer.getData("text/plain");
            const caret = document.caretRangeFromPoint?.(e.clientX, e.clientY);
            if (caret) {
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(caret);
            }
            insert(html, text, e.timeStamp);
          }}
          onKeyDown={(e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (e.nativeEvent.isComposing) return;
            if (mod && !e.altKey) {
              const k = e.key.toLowerCase();
              if (k === "b" || k === "u") {
                e.preventDefault();
                format(k, e.timeStamp);
              } else if (k === "i") {
                e.preventDefault(); // 기울임은 지원하지 않음
              } else if (k === "z" || k === "y") {
                e.preventDefault();
                undoRedo(k === "y" || e.shiftKey ? 1 : -1);
              }
            } else if (e.key === "Enter") {
              // 줄바꿈은 <br>로 (문단 상자 대신) — 지원하지 않는 브라우저는 기본 동작
              if (document.execCommand("insertLineBreak")) e.preventDefault();
            }
          }}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onFocus={refreshActive}
        />
      </div>
    </div>
  );
}
