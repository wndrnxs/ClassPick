"use client";

/**
 * 자료 수정 화면의 입력 부품.
 * Bind<T>는 "값 + 바꾸는 함수" 묶음으로, 중첩된 자료 구조의 한 칸을 그대로 입력 칸에 연결합니다.
 */
import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export type Bind<T> = { value: T; set: (value: T) => void };

/** 객체의 한 속성 */
export function at<T, K extends keyof T>(b: Bind<T>, key: K): Bind<T[K]> {
  return { value: b.value[key], set: (v) => b.set({ ...b.value, [key]: v }) };
}

/** 배열의 각 칸 */
export function each<T>(b: Bind<T[]>): Bind<T>[] {
  return b.value.map((value, i) => ({ value, set: (v) => b.set(b.value.map((x, j) => (j === i ? v : x))) }));
}

const fieldBase =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20";

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-xs font-bold text-slate-600">
        {label}
        {hint && <span className="font-medium text-muted-foreground">{hint}</span>}
      </label>
      {children(id)}
    </div>
  );
}

/** 한 줄 입력 */
export function TextInput({ label, b, hint, placeholder, className }: { label: string; b: Bind<string>; hint?: string; placeholder?: string; className?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} value={b.value} placeholder={placeholder} onChange={(e) => b.set(e.target.value)} className={cn(fieldBase, "h-9")} />}
    </Field>
  );
}

/** 여러 줄 입력 (내용만큼 늘어남) */
export function TextArea({
  label,
  b,
  hint,
  placeholder,
  className,
  passage,
}: {
  label: string;
  b: Bind<string>;
  hint?: string;
  placeholder?: string;
  className?: string;
  /** 지문 글꼴(명조)로 보여 줄지 */
  passage?: boolean;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <textarea
          id={id}
          value={b.value}
          placeholder={placeholder}
          onChange={(e) => b.set(e.target.value)}
          rows={2}
          className={cn(fieldBase, "field-sizing-content min-h-16 resize-y leading-relaxed", passage && "passage text-[15px]")}
        />
      )}
    </Field>
  );
}

/** 비워 두면 null (예: <보기>, 출제 포인트) */
export function NullableArea({ label, b, hint, placeholder, className }: { label: string; b: Bind<string | null>; hint?: string; placeholder?: string; className?: string }) {
  return (
    <TextArea
      label={label}
      hint={hint}
      placeholder={placeholder}
      className={className}
      b={{ value: b.value ?? "", set: (v) => b.set(v.trim() ? v : null) }}
    />
  );
}

export function NumberInput({ label, b, min, max, className }: { label: string; b: Bind<number>; min?: number; max?: number; className?: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isFinite(b.value) ? b.value : ""}
          onChange={(e) => b.set(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          className={cn(fieldBase, "h-9 tabular-nums")}
        />
      )}
    </Field>
  );
}

export function SelectInput<T extends string>({ label, b, options, className }: { label: string; b: Bind<T>; options: readonly T[]; className?: string }) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <NativeSelect id={id} value={b.value} onChange={(e) => b.set(e.target.value as T)} className="h-9 text-sm">
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </NativeSelect>
      )}
    </Field>
  );
}

/** 문자열 목록 (성격 키워드, 출제 포인트, 조건 등) */
export function StringList({ label, b, addLabel = "추가", placeholder, multiline }: { label: string; b: Bind<string[]>; addLabel?: string; placeholder?: string; multiline?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      {each(b).map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-2 w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
          {multiline ? (
            <textarea
              aria-label={`${label} ${i + 1}`}
              value={item.value}
              placeholder={placeholder}
              onChange={(e) => item.set(e.target.value)}
              rows={1}
              className={cn(fieldBase, "field-sizing-content min-h-9 resize-y leading-relaxed")}
            />
          ) : (
            <input aria-label={`${label} ${i + 1}`} value={item.value} placeholder={placeholder} onChange={(e) => item.set(e.target.value)} className={cn(fieldBase, "h-9")} />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground"
            aria-label={`${label} ${i + 1} 삭제`}
            onClick={() => b.set(b.value.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => b.set([...b.value, ""])}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

/** 객체 목록 (문항, 구절 해설 등): 카드마다 순서 바꾸기·삭제, 맨 아래에 추가 */
export function ItemList<T>({
  b,
  itemLabel,
  render,
  make,
  addLabel,
  min = 0,
}: {
  b: Bind<T[]>;
  itemLabel: (i: number) => string;
  render: (item: Bind<T>, i: number) => React.ReactNode;
  make?: () => T;
  addLabel?: string;
  min?: number;
}) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...b.value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    b.set(next);
  };
  return (
    <div className="space-y-3">
      {each(b).map((item, i) => (
        <section key={i} className="rounded-xl border bg-card">
          <header className="flex items-center justify-between gap-2 border-b bg-surface/60 px-3 py-1.5">
            <h4 className="text-sm font-extrabold text-slate-800">{itemLabel(i)}</h4>
            <div className="flex items-center">
              <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`${itemLabel(i)} 위로`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`${itemLabel(i)} 아래로`}
                disabled={i === b.value.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-red-600"
                aria-label={`${itemLabel(i)} 삭제`}
                disabled={b.value.length <= min}
                onClick={() => b.set(b.value.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          </header>
          <div className="space-y-3 p-3 sm:p-4">{render(item, i)}</div>
        </section>
      ))}
      {make && (
        <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => b.set([...b.value, make()])}>
          <Plus /> {addLabel ?? "추가"}
        </Button>
      )}
    </div>
  );
}
