/**
 * HWPX section0.xml 생성기 — DocModel 블록을 OWPML 문단(hp:p)·표(hp:tbl)로 변환합니다.
 * A4(210×297mm), 좌우 여백 30mm 기준 본문 폭 42520 HWPUNIT.
 */
import type { Block, DocModel, Run, RunColor } from "../doc-model";
import { BORDER, CHAR, PARA, richChar } from "./header";
import { esc, OWPML_NS, XML_DECL } from "./xml";

const PAGE_WIDTH = 59528;
/** 단 사이 간격 8mm */
const COLUMN_GAP = 2268;

/** 쪽 여백 — 2단 시험지는 수능 문제지처럼 좁게(좌우 15mm), 1단 문서는 넓게(좌우 30mm) */
const MARGINS = {
  wide: { left: 8504, right: 8504, top: 5668, bottom: 4252, header: 4252, footer: 4252 },
  narrow: { left: 4252, right: 4252, top: 2835, bottom: 2835, header: 1417, footer: 1417 },
} as const;

function secPr(margins: (typeof MARGINS)[keyof typeof MARGINS]) {
  return (
    '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">' +
    '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>' +
    '<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>' +
    '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>' +
    '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>' +
    `<hp:pagePr landscape="WIDELY" width="${PAGE_WIDTH}" height="84186" gutterType="LEFT_ONLY"><hp:margin header="${margins.header}" footer="${margins.footer}" gutter="0" left="${margins.left}" right="${margins.right}" top="${margins.top}" bottom="${margins.bottom}"/></hp:pagePr>` +
    '<hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr>' +
    '<hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>' +
    ["BOTH", "EVEN", "ODD"]
      .map(
        (t) =>
          `<hp:pageBorderFill type="${t}" borderFillIDRef="${BORDER.none}" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>`,
      )
      .join("") +
    "</hp:secPr>"
  );
}

/** 단 정의 (2단 이상이면 단 사이에 구분선) */
const colPr = (count: number) =>
  `<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="${count}" sameSz="1" sameGap="${count > 1 ? COLUMN_GAP : 0}">${
    count > 1 ? '<hp:colLine type="SOLID" width="0.12 mm" color="#000000"/>' : ""
  }</hp:colPr></hp:ctrl>`;

type CellRun = { text: string; charPr: number };
/** 표 칸 안의 문단 하나 (구간 여러 개) */
type CellPara = CellRun[];
const cellText = (text: string, charPr: number): CellPara => [{ text, charPr }];

const COLOR_CHAR: Record<RunColor, number> = {
  accent: CHAR.accent,
  danger: CHAR.danger,
  emerald: CHAR.emerald,
  muted: CHAR.muted,
};

function charOf(run: Run, base: number = CHAR.body): number {
  if (run.color) return COLOR_CHAR[run.color];
  if (base === CHAR.small) return run.bold ? CHAR.smallBold : base;
  const mask = (run.bold ? 1 : 0) | (run.underline ? 2 : 0) | (run.boxed ? 4 : 0);
  if (mask === 0) return base;
  return mask === 1 ? CHAR.bodyBold : richChar(mask);
}

class SectionWriter {
  private readonly textWidth: number;
  /** 지금 단의 폭 (표 너비) */
  private width: number;
  /** 다음 문단 앞에 넣을 단 정의 */
  private pendingCtrl = "";
  constructor(private readonly margins: (typeof MARGINS)[keyof typeof MARGINS]) {
    this.textWidth = PAGE_WIDTH - margins.left - margins.right;
    this.width = this.textWidth;
  }
  private paraId = 0;
  private tableId = 1000;
  private pendingPageBreak = false;
  private out: string[] = [];

  private run(charPr: number, text: string) {
    return `<hp:run charPrIDRef="${charPr}">${text ? `<hp:t>${esc(text)}</hp:t>` : "<hp:t/>"}</hp:run>`;
  }

  private open(paraPr: number) {
    const pageBreak = this.pendingPageBreak ? 1 : 0;
    this.pendingPageBreak = false;
    return `<hp:p id="${this.paraId++}" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="${pageBreak}" columnBreak="0" merged="0">`;
  }

  private takeCtrl() {
    const ctrl = this.pendingCtrl;
    this.pendingCtrl = "";
    return ctrl ? `<hp:run charPrIDRef="${CHAR.body}">${ctrl}</hp:run>` : "";
  }

  paragraph(paraPr: number, runs: { charPr: number; text: string }[], prefix = "") {
    const body = runs.length ? runs.map((r) => this.run(r.charPr, r.text)).join("") : this.run(CHAR.body, "");
    this.out.push(`${this.open(paraPr)}${prefix}${this.takeCtrl()}${body}</hp:p>`);
  }

  /** 이 지점부터 단 수를 바꿉니다 (다단 설정 나누기). */
  columns(count: 1 | 2) {
    this.pendingCtrl = colPr(count);
    this.width = count === 1 ? this.textWidth : Math.floor((this.textWidth - COLUMN_GAP * (count - 1)) / count);
  }

  /** 문서 첫 문단: 구역 정의(secPr)와 단 정의를 포함해야 합니다. */
  first(title: string) {
    const ctrl = '<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>';
    this.out.push(
      `${this.open(PARA.title)}<hp:run charPrIDRef="${CHAR.title}">${secPr(this.margins)}${ctrl}</hp:run>${this.run(CHAR.title, title)}</hp:p>`,
    );
  }

  pageBreak() {
    this.pendingPageBreak = true;
  }

  private cell(
    texts: CellPara[],
    opts: { col: number; row: number; width: number; header: boolean; border: number; paraPr: number },
  ) {
    const paras = (texts.length ? texts : [cellText("", CHAR.small)])
      .map(
        (para) =>
          `<hp:p paraPrIDRef="${opts.paraPr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="${this.paraId++}">${(para.length
            ? para
            : cellText("", CHAR.body)
          )
            .map((r) => this.run(r.charPr, r.text))
            .join("")}</hp:p>`,
      )
      .join("");
    return (
      `<hp:tc name="" header="${opts.header ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${opts.border}">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras}</hp:subList>` +
      `<hp:cellAddr colAddr="${opts.col}" rowAddr="${opts.row}"/><hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="${opts.width}" height="1000"/><hp:cellMargin left="510" right="510" top="283" bottom="283"/></hp:tc>`
    );
  }

  table(rows: { cells: CellPara[][]; header: boolean; border: number }[], ratios: number[], paraPr: number = PARA.cell) {
    const total = ratios.reduce((a, b) => a + b, 0);
    const tableWidth = this.width;
    const widths = ratios.map((r) => Math.floor((r / total) * tableWidth));
    widths[widths.length - 1] += tableWidth - widths.reduce((a, b) => a + b, 0);
    const trs = rows
      .map(
        (row, r) =>
          `<hp:tr>${row.cells
            .map((texts, c) =>
              this.cell(texts, { col: c, row: r, width: widths[c], header: row.header, border: row.border, paraPr }),
            )
            .join("")}</hp:tr>`,
      )
      .join("");
    const tbl =
      `<hp:tbl id="${this.tableId++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="${
        rows[0]?.header ? 1 : 0
      }" rowCnt="${rows.length}" colCnt="${ratios.length}" cellSpacing="0" borderFillIDRef="${BORDER.table}" noAdjust="0">` +
      `<hp:sz width="${tableWidth}" widthRelTo="ABSOLUTE" height="${rows.length * 1000}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl>`;
    this.out.push(`${this.open(PARA.body)}${this.takeCtrl()}<hp:run charPrIDRef="${CHAR.body}">${tbl}</hp:run></hp:p>`);
  }

  toXml() {
    return `${XML_DECL}<hs:sec ${OWPML_NS}>${this.out.join("")}</hs:sec>`;
  }
}

function writeBlock(w: SectionWriter, block: Block) {
  switch (block.type) {
    case "title":
      w.paragraph(PARA.title, [{ charPr: CHAR.title, text: block.text }]);
      break;
    case "meta":
      w.paragraph(PARA.center, [{ charPr: CHAR.meta, text: block.text }]);
      break;
    case "heading":
      w.paragraph(PARA.heading, [{ charPr: block.level === 1 ? CHAR.h1 : CHAR.h2, text: block.text }]);
      break;
    case "paragraph": {
      const paraPr = block.align === "center" ? PARA.center : block.align === "right" ? PARA.right : block.indent ? PARA.indent : PARA.body;
      w.paragraph(
        paraPr,
        block.runs.map((r) => ({ charPr: charOf(r), text: r.text })),
      );
      break;
    }
    case "table": {
      const cols = block.header?.length ?? block.rows[0]?.length ?? 1;
      const ratios = block.widths ?? Array.from({ length: cols }, () => 1);
      const rows = [
        ...(block.header
          ? [{ cells: block.header.map((h) => [cellText(h, CHAR.smallBold)]), header: true, border: BORDER.tableHeader }]
          : []),
        ...block.rows.map((r) => ({
          cells: Array.from({ length: cols }, (_, i) =>
            (r[i] ?? "").split("\n").map((text) => cellText(text, CHAR.small)),
          ),
          header: false,
          border: BORDER.table,
        })),
      ];
      w.table(rows, ratios);
      break;
    }
    case "box": {
      const texts: CellPara[] = [
        ...(block.title ? [cellText(block.title, CHAR.bodyBold)] : []),
        ...block.lines.map((line) =>
          typeof line === "string" ? cellText(line, CHAR.body) : line.map((r) => ({ text: r.text, charPr: charOf(r) })),
        ),
      ];
      w.table([{ cells: [texts], header: false, border: block.tone === "plain" ? BORDER.table : BORDER.box }], [1], block.indentFirst ? PARA.passageIndent : PARA.passage);
      break;
    }
    case "pageBreak":
      w.pageBreak();
      break;
    case "spacer":
      w.paragraph(PARA.body, []);
      break;
    case "columns":
      w.columns(block.count);
      break;
  }
}

export function buildSectionXml(doc: DocModel): string {
  const twoColumn = doc.blocks.some((b) => b.type === "columns" && b.count === 2);
  const w = new SectionWriter(twoColumn ? MARGINS.narrow : MARGINS.wide);
  const [first, ...rest] = doc.blocks;
  if (first?.type === "title") {
    w.first(first.text);
  } else {
    w.first(doc.title);
    if (first) writeBlock(w, first);
  }
  for (const block of rest) writeBlock(w, block);
  return w.toXml();
}
