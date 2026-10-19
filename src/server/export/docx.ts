/** DocModel → DOCX (Microsoft Word / Google Docs 호환) */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  SectionType,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { hasOldHangul } from "@/lib/rich-text";

import type { Block, DocModel, Run, RunColor } from "./doc-model";

const COLORS: Record<RunColor, string> = { accent: "2563EB", danger: "DC2626", emerald: "047857", muted: "64748B" };
const SERIF = "바탕";
const SANS = "맑은 고딕";

// 옛한글(첫가끝 자모)은 조합을 지원하는 함초롬바탕으로 (한글과컴퓨터 무료 글꼴, 한컴오피스와 함께 설치됨)
const OLD_HANGUL_FONT = "함초롬바탕";

const textRun = (r: Run, size = 21) =>
  new TextRun({
    text: r.text,
    bold: r.bold || Boolean(r.color && r.color !== "muted"),
    underline: r.underline ? {} : undefined,
    border: r.boxed ? { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 1 } : undefined,
    color: r.color ? COLORS[r.color] : undefined,
    size,
    font: hasOldHangul(r.text) ? OLD_HANGUL_FONT : SERIF,
  });

const border = { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function table(block: Extract<Block, { type: "table" }>) {
  const cols = block.header?.length ?? block.rows[0]?.length ?? 1;
  const ratios = block.widths ?? Array.from({ length: cols }, () => 1);
  const total = ratios.reduce((a, b) => a + b, 0);
  const mkCell = (text: string, header: boolean, i: number) =>
    new TableCell({
      borders: cellBorders,
      width: { size: Math.round((ratios[i] / total) * 100), type: WidthType.PERCENTAGE },
      shading: header ? { type: ShadingType.CLEAR, fill: "EEF2FF", color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: text.split("\n").map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, bold: header, size: 19, font: header ? SANS : SERIF })] }),
      ),
    });
  const rows = [
    ...(block.header ? [new TableRow({ tableHeader: true, children: block.header.map((h, i) => mkCell(h, true, i)) })] : []),
    ...block.rows.map(
      (r) => new TableRow({ children: Array.from({ length: cols }, (_, i) => mkCell(r[i] ?? "", false, i)) }),
    ),
  ];
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function box(block: Extract<Block, { type: "box" }>) {
  const children = [
    ...(block.title ? [new Paragraph({ children: [new TextRun({ text: block.title, bold: true, size: 21, font: SANS })] })] : []),
    ...block.lines.map(
      (line) => new Paragraph({ spacing: { line: 380 }, children: (typeof line === "string" ? [{ text: line }] : line).map((r) => textRun(r)) }),
    ),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { ...border, color: "475569" }, bottom: { ...border, color: "475569" }, left: { ...border, color: "475569" }, right: { ...border, color: "475569" } },
            shading: block.tone === "plain" ? undefined : { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" },
            margins: { top: 160, bottom: 160, left: 220, right: 220 },
            children,
          }),
        ],
      }),
    ],
  });
}

// 2단 시험지는 수능 문제지처럼 여백을 좁게 (twip: 1mm ≈ 56.7)
const MARGIN_WIDE = { top: 1134, bottom: 1134, left: 1247, right: 1247 };
const MARGIN_NARROW = { top: 680, bottom: 680, left: 850, right: 850 };
const COLUMN_GAP = 454; // 8mm

export async function buildDocx(doc: DocModel): Promise<Uint8Array> {
  const twoColumn = doc.blocks.some((b) => b.type === "columns" && b.count === 2);
  const margin = twoColumn ? MARGIN_NARROW : MARGIN_WIDE;
  // 단 수가 바뀌는 지점마다 '구역(이어서)'을 새로 시작합니다.
  const sections: { count: 1 | 2; children: (Paragraph | Table)[] }[] = [{ count: 1, children: [] }];
  let children = sections[0].children;
  let breakNext = false;
  const push = (el: Paragraph | Table) => {
    if (breakNext) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      breakNext = false;
    }
    children.push(el);
  };

  for (const block of doc.blocks) {
    switch (block.type) {
      case "title":
        push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: block.text, bold: true, size: 36, color: "1E3A8A", font: SANS })] }));
        break;
      case "meta":
        push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: block.text, size: 18, color: "64748B", font: SANS })] }));
        break;
      case "heading":
        push(
          new Paragraph({
            heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 100 },
            keepNext: true,
            children: [new TextRun({ text: block.text, bold: true, size: block.level === 1 ? 26 : 22, color: block.level === 1 ? "1E40AF" : "0F172A", font: SANS })],
          }),
        );
        break;
      case "paragraph":
        push(
          new Paragraph({
            alignment: block.align === "center" ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
            indent: block.indent ? { left: 400 } : undefined,
            spacing: { after: 80, line: 320 },
            children: block.runs.map((r) => textRun(r)),
          }),
        );
        break;
      case "table":
        push(table(block));
        push(new Paragraph({ children: [] }));
        break;
      case "box":
        push(box(block));
        push(new Paragraph({ children: [] }));
        break;
      case "pageBreak":
        breakNext = true;
        break;
      case "spacer":
        push(new Paragraph({ children: [] }));
        break;
      case "columns":
        if (children.length === 0) sections[sections.length - 1].count = block.count;
        else {
          sections.push({ count: block.count, children: [] });
          children = sections[sections.length - 1].children;
        }
        break;
    }
  }

  const document = new Document({
    creator: "ClassPick",
    title: doc.title,
    description: "클래스픽(ClassPick)에서 생성한 수업 자료",
    styles: { default: { document: { run: { font: SERIF, size: 21 } } } },
    sections: sections
      .filter((sec) => sec.children.length > 0)
      .map((sec, i) => ({
        properties: {
          ...(i > 0 && { type: SectionType.CONTINUOUS }),
          page: { margin },
          column: sec.count === 2 ? { count: 2, space: COLUMN_GAP, separate: true, equalWidth: true } : { count: 1 },
        },
        children: sec.children,
      })),
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
