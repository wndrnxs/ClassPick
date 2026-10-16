/**
 * HWPX section0.xml 생성기 — DocModel 블록을 OWPML 문단(hp:p)·표(hp:tbl)로 변환합니다.
 * A4(210×297mm), 좌우 여백 30mm 기준 본문 폭 42520 HWPUNIT.
 */
import type { Block, DocModel, Run, RunColor } from "../doc-model";
import { BORDER, CHAR, PARA } from "./header";
import { esc, OWPML_NS, XML_DECL } from "./xml";

const TEXT_WIDTH = 42520;

const SEC_PR =
  '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">' +
  '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>' +
  '<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>' +
  '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>' +
  '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>' +
  '<hp:pagePr landscape="WIDELY" width="59528" height="84186" gutterType="LEFT_ONLY"><hp:margin header="4252" footer="4252" gutter="0" left="8504" right="8504" top="5668" bottom="4252"/></hp:pagePr>' +
  '<hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr>' +
  '<hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr>' +
  ["BOTH", "EVEN", "ODD"]
    .map(
      (t) =>
        `<hp:pageBorderFill type="${t}" borderFillIDRef="${BORDER.none}" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>`,
    )
    .join("") +
  "</hp:secPr>";

type CellPara = { text: string; charPr: number };

const COLOR_CHAR: Record<RunColor, number> = {
  accent: CHAR.accent,
  danger: CHAR.danger,
  emerald: CHAR.emerald,
  muted: CHAR.muted,
};

function charOf(run: Run, base: number = CHAR.body): number {
  if (run.color) return COLOR_CHAR[run.color];
  if (run.bold) return base === CHAR.small ? CHAR.smallBold : CHAR.bodyBold;
  return base;
}

class SectionWriter {
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

  paragraph(paraPr: number, runs: { charPr: number; text: string }[], prefix = "") {
    const body = runs.length ? runs.map((r) => this.run(r.charPr, r.text)).join("") : this.run(CHAR.body, "");
    this.out.push(`${this.open(paraPr)}${prefix}${body}</hp:p>`);
  }

  /** 문서 첫 문단: 구역 정의(secPr)와 단 정의를 포함해야 합니다. */
  first(title: string) {
    const ctrl = '<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>';
    this.out.push(
      `${this.open(PARA.title)}<hp:run charPrIDRef="${CHAR.title}">${SEC_PR}${ctrl}</hp:run>${this.run(CHAR.title, title)}</hp:p>`,
    );
  }

  pageBreak() {
    this.pendingPageBreak = true;
  }

  private cell(
    texts: CellPara[],
    opts: { col: number; row: number; width: number; header: boolean; border: number; paraPr: number },
  ) {
    const paras = (texts.length ? texts : [{ text: "", charPr: CHAR.small }])
      .map(
        (t) =>
          `<hp:p paraPrIDRef="${opts.paraPr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="${this.paraId++}">${this.run(
            t.charPr,
            t.text,
          )}</hp:p>`,
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
    const widths = ratios.map((r) => Math.floor((r / total) * TEXT_WIDTH));
    widths[widths.length - 1] += TEXT_WIDTH - widths.reduce((a, b) => a + b, 0);
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
      `<hp:sz width="${TEXT_WIDTH}" widthRelTo="ABSOLUTE" height="${rows.length * 1000}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl>`;
    this.out.push(`${this.open(PARA.body)}<hp:run charPrIDRef="${CHAR.body}">${tbl}</hp:run></hp:p>`);
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
      const paraPr = block.align === "center" ? PARA.center : block.indent ? PARA.indent : PARA.body;
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
          ? [{ cells: block.header.map((h) => [{ text: h, charPr: CHAR.smallBold }]), header: true, border: BORDER.tableHeader }]
          : []),
        ...block.rows.map((r) => ({
          cells: Array.from({ length: cols }, (_, i) =>
            (r[i] ?? "").split("\n").map((text) => ({ text, charPr: CHAR.small })),
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
        ...(block.title ? [{ text: block.title, charPr: CHAR.bodyBold }] : []),
        ...block.lines.map((text) => ({ text, charPr: CHAR.body })),
      ];
      w.table([{ cells: [texts], header: false, border: block.tone === "plain" ? BORDER.table : BORDER.box }], [1], PARA.passage);
      break;
    }
    case "pageBreak":
      w.pageBreak();
      break;
    case "spacer":
      w.paragraph(PARA.body, []);
      break;
  }
}

export function buildSectionXml(doc: DocModel): string {
  const w = new SectionWriter();
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
