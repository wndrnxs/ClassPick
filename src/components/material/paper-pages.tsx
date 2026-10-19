"use client";

/**
 * A4 쪽 나눔 — 수능 문제지처럼 쪽마다 왼쪽 단을 먼저 채우고, 넘치는 내용은 오른쪽 단 → 다음 쪽으로 이어집니다.
 *
 * 원리: 본문 전체를 높이가 고정된 다단(column-fill: auto) 상자 하나에 흘리면, 넘친 내용은 오른쪽으로 단이 계속 생깁니다.
 * 같은 상자를 쪽 수만큼 그리고 쪽마다 (2단 폭 + 단 간격)씩 왼쪽으로 옮겨 잘라 보여 주면, 단이 쪽 단위로 끊겨 보입니다.
 * 화면·인쇄가 같은 쪽 구성을 씁니다. 화면이 좁으면(휴대폰) 쪽 대신 1단으로 이어서 보여 줍니다.
 */
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** 쪽 규격(mm): A4, 여백 12mm, 머리띠 20mm, 쪽 번호 9mm */
const SHEET = { width: 210, height: 297, pad: 12, head: 20, foot: 9 };
const BODY_W = SHEET.width - SHEET.pad * 2; // 186mm
const BODY_H = SHEET.height - SHEET.pad * 2 - SHEET.head - SHEET.foot; // 244mm
const GAP = 7; // 단 간격(mm)
const MM = 96 / 25.4; // CSS px per mm

export type PaperHead = { title: string; sub?: string; badge?: string };

function Sheet({ head, page, total, columns, children }: { head: PaperHead; page: number; total: number; columns: 1 | 2; children: React.ReactNode }) {
  return (
    <section
      className="paper-sheet relative mx-auto bg-white text-black shadow-[0_2px_12px_rgb(15_23_42/0.18)] print:shadow-none"
      style={{ width: `${SHEET.width}mm`, height: `${SHEET.height}mm`, padding: `${SHEET.pad}mm` }}
      aria-hidden={page > 0 || undefined}
      aria-label={page === 0 ? undefined : `${page + 1}쪽`}
    >
      <header className="flex flex-col justify-end border-b-[2.5px] border-black pb-1" style={{ height: `${SHEET.head}mm` }}>
        <div className="grid grid-cols-[3.2em_minmax(0,1fr)_auto] items-end gap-3">
          <span className="font-serif text-[2.3em] leading-none font-black">{page + 1}</span>
          <h1 className="truncate text-center font-sans text-[1.75em] leading-tight font-black tracking-tight">{head.title}</h1>
          <span className={cn("min-w-[3.2em] text-right", head.badge && "rounded-md border-2 border-black px-1.5 py-0.5 text-center font-sans text-[0.85em] font-bold")}>
            {head.badge}
          </span>
        </div>
        {head.sub && <p className="mt-0.5 truncate text-center font-sans text-[0.75em] text-slate-600">{head.sub}</p>}
      </header>
      {/* 본문: 이 쪽에 해당하는 두 단만 보이도록 잘라 냄 */}
      <div className="relative overflow-hidden" style={{ width: `${BODY_W}mm`, height: `${BODY_H - 3}mm`, marginTop: "3mm" }}>
        {/* 단 구분선: CSS column-rule은 양쪽 단에 내용이 있을 때만 그려지므로, 마지막 쪽처럼 오른쪽 단이 비어도 보이도록 직접 그림 */}
        {columns === 2 && <div aria-hidden className="absolute inset-y-0 border-l border-black" style={{ left: `${(BODY_W - GAP) / 2 + GAP / 2}mm` }} />}
        <div
          className="paper-flow-cols"
          style={{
            width: `${BODY_W}mm`,
            height: `${BODY_H - 3}mm`,
            columnCount: columns,
            columnGap: `${GAP}mm`,
            columnFill: "auto",
            transform: page ? `translateX(-${page * (BODY_W + GAP)}mm)` : undefined,
          }}
        >
          {children}
        </div>
      </div>
      <footer className="absolute inset-x-0 flex justify-center" style={{ bottom: `${SHEET.pad - 4}mm` }}>
        <span className="border border-black px-2 font-sans text-[0.8em] tabular-nums">
          {page + 1} / {total}
        </span>
      </footer>
    </section>
  );
}

export function PaperPages({ head, columns, children }: { head: PaperHead; columns: 1 | 2; children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ pages: 1, zoom: 1 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      // 첫 쪽의 본문 상자(잘라 내는 틀)는 넘친 단까지 포함한 전체 폭을 scrollWidth로 알려 줍니다.
      const viewport = probeRef.current?.querySelector<HTMLElement>(".paper-flow-cols")?.parentElement;
      if (!viewport || !viewport.clientWidth) return;
      const mmPerPx = BODY_W / viewport.clientWidth;
      const colW = columns === 2 ? (BODY_W - GAP) / 2 : BODY_W;
      const totalCols = Math.max(1, Math.round((viewport.scrollWidth * mmPerPx + GAP) / (colW + GAP)));
      const pages = Math.max(1, Math.ceil(totalCols / columns));
      const zoom = Math.min(1, wrap.clientWidth / (SHEET.width * MM));
      setLayout((prev) => (prev.pages === pages && Math.abs(prev.zoom - zoom) < 0.005 ? prev : { pages, zoom }));
    };
    measure();
    void document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [columns, children]);

  const { pages, zoom } = layout;
  return (
    <div ref={wrapRef} className="w-full">
      <div className="paper-pages paper-page-text space-y-6 print:space-y-0" style={{ zoom }}>
        {Array.from({ length: pages }, (_, i) => (
          <div key={i} ref={i === 0 ? probeRef : undefined}>
            <Sheet head={head} page={i} total={pages} columns={columns}>
              {children}
            </Sheet>
          </div>
        ))}
      </div>
      {/* 휴대폰 화면: 쪽 대신 1단으로 이어 보기 */}
      <div className="paper-flow">
        <header className="mb-3 border-b-2 border-black pb-1.5 text-center">
          <h1 className="font-sans text-xl font-black">{head.title}</h1>
          {(head.sub || head.badge) && <p className="text-xs text-slate-600">{[head.sub, head.badge].filter(Boolean).join(" · ")}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
