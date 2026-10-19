/**
 * HWPX header.xml 생성기
 * 글꼴(fontfaces), 테두리/배경(borderFills), 글자 모양(charPr), 문단 모양(paraPr), 스타일을 정의합니다.
 * 단위: HWPUNIT (1pt = 100)
 */
import { OWPML_NS, XML_DECL } from "./xml";

const LANGS = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"] as const;
const FONTS = ["함초롬돋움", "함초롬바탕"] as const; // 0: 돋움(제목), 1: 바탕(본문)

/** 글자 모양 ID */
export const CHAR = {
  body: 0,
  bodyBold: 1,
  title: 2,
  h1: 3,
  h2: 4,
  meta: 5,
  accent: 6,
  danger: 7,
  emerald: 8,
  small: 9,
  smallBold: 10,
  muted: 11,
} as const;

/** 지문 서식 조합(굵게 1 · 밑줄 2 · 네모 박스 4)별 본문 글자 모양 ID: 12~18 */
export const richChar = (mask: number) => 11 + mask;

type CharDef = { height: number; color: string; font: 0 | 1; bold?: boolean; underline?: boolean; boxed?: boolean };

const CHAR_DEFS: Record<number, CharDef> = {
  [CHAR.body]: { height: 1000, color: "#000000", font: 1 },
  [CHAR.bodyBold]: { height: 1000, color: "#000000", font: 1, bold: true },
  [CHAR.title]: { height: 1800, color: "#1E3A8A", font: 0, bold: true },
  [CHAR.h1]: { height: 1300, color: "#1E40AF", font: 0, bold: true },
  [CHAR.h2]: { height: 1100, color: "#0F172A", font: 0, bold: true },
  [CHAR.meta]: { height: 900, color: "#64748B", font: 0 },
  [CHAR.accent]: { height: 1000, color: "#2563EB", font: 1, bold: true },
  [CHAR.danger]: { height: 1000, color: "#DC2626", font: 1, bold: true },
  [CHAR.emerald]: { height: 1000, color: "#047857", font: 1, bold: true },
  [CHAR.small]: { height: 900, color: "#000000", font: 1 },
  [CHAR.smallBold]: { height: 900, color: "#0F172A", font: 0, bold: true },
  [CHAR.muted]: { height: 1000, color: "#64748B", font: 1 },
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7].map((mask) => [
      richChar(mask),
      { height: 1000, color: "#000000", font: 1, bold: !!(mask & 1), underline: !!(mask & 2), boxed: !!(mask & 4) } satisfies CharDef,
    ]),
  ),
};

/** 문단 모양 ID */
export const PARA = {
  body: 0,
  center: 1,
  heading: 2,
  indent: 3,
  cell: 4,
  passage: 5,
  title: 6,
  /** 산문 지문: 문단 첫 줄 들여쓰기 */
  passageIndent: 7,
  right: 8,
} as const;

type ParaDef = {
  align: "JUSTIFY" | "LEFT" | "CENTER" | "RIGHT";
  /** 첫 줄 들여쓰기 (HWPUNIT) */
  firstLine?: number;
  lineSpacing: number;
  left?: number;
  prev?: number;
  next?: number;
  keepWithNext?: boolean;
};

const PARA_DEFS: Record<number, ParaDef> = {
  [PARA.body]: { align: "JUSTIFY", lineSpacing: 160, next: 200 },
  [PARA.center]: { align: "CENTER", lineSpacing: 160, next: 200 },
  [PARA.heading]: { align: "LEFT", lineSpacing: 150, prev: 1200, next: 400, keepWithNext: true },
  [PARA.indent]: { align: "JUSTIFY", lineSpacing: 160, left: 1500, next: 200 },
  [PARA.cell]: { align: "LEFT", lineSpacing: 140 },
  [PARA.passage]: { align: "JUSTIFY", lineSpacing: 180 },
  [PARA.title]: { align: "CENTER", lineSpacing: 150, next: 300 },
  [PARA.passageIndent]: { align: "JUSTIFY", lineSpacing: 180, firstLine: 1000 },
  [PARA.right]: { align: "RIGHT", lineSpacing: 160, next: 200 },
};

/** 테두리/배경 ID */
export const BORDER = {
  none: 1,
  charDefault: 2,
  table: 3,
  tableHeader: 4,
  box: 5,
  /** 글자 테두리 (지문의 네모 박스) */
  charBox: 6,
} as const;

const langAttrs = (value: string | number) => LANGS.map((l) => `${l.toLowerCase()}="${value}"`).join(" ");

function fontfaces() {
  const fonts = FONTS.map(
    (face, id) =>
      `<hh:font id="${id}" face="${face}" type="TTF" isEmbedded="0"><hh:typeInfo familyType="${
        id === 0 ? "FCAT_GOTHIC" : "FCAT_MYUNGJO"
      }" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>`,
  ).join("");
  return `<hh:fontfaces itemCnt="${LANGS.length}">${LANGS.map(
    (lang) => `<hh:fontface lang="${lang}" fontCnt="${FONTS.length}">${fonts}</hh:fontface>`,
  ).join("")}</hh:fontfaces>`;
}

function borderFill(id: number, opts: { border: boolean; fill?: string; width?: string; color?: string }) {
  const type = opts.border ? "SOLID" : "NONE";
  const width = opts.width ?? (opts.border ? "0.12 mm" : "0.1 mm");
  const color = opts.color ?? "#000000";
  const side = (name: string) => `<hh:${name} type="${type}" width="${width}" color="${color}"/>`;
  const fill =
    opts.fill !== undefined
      ? `<hc:fillBrush><hc:winBrush faceColor="${opts.fill}" hatchColor="#999999" alpha="0"/></hc:fillBrush>`
      : "";
  return `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>${side(
    "leftBorder",
  )}${side("rightBorder")}${side("topBorder")}${side("bottomBorder")}<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>${fill}</hh:borderFill>`;
}

function borderFills() {
  const items = [
    borderFill(BORDER.none, { border: false }),
    borderFill(BORDER.charDefault, { border: false, fill: "none" }),
    borderFill(BORDER.table, { border: true, color: "#94A3B8" }),
    borderFill(BORDER.tableHeader, { border: true, color: "#94A3B8", fill: "#EEF2FF" }),
    borderFill(BORDER.box, { border: true, color: "#475569", fill: "#F8FAFC" }),
    borderFill(BORDER.charBox, { border: true, color: "#000000", width: "0.12 mm" }),
  ];
  return `<hh:borderFills itemCnt="${items.length}">${items.join("")}</hh:borderFills>`;
}

function charProperties() {
  const ids = Object.keys(CHAR_DEFS).map(Number);
  const items = ids.map((id) => {
    const d = CHAR_DEFS[id];
    return `<hh:charPr id="${id}" height="${d.height}" textColor="${d.color}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="${d.boxed ? BORDER.charBox : BORDER.charDefault}"><hh:fontRef ${langAttrs(
      d.font,
    )}/><hh:ratio ${langAttrs(100)}/><hh:spacing ${langAttrs(0)}/><hh:relSz ${langAttrs(100)}/><hh:offset ${langAttrs(0)}/>${
      d.bold ? "<hh:bold/>" : ""
    }<hh:underline type="${d.underline ? "BOTTOM" : "NONE"}" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>`;
  });
  return `<hh:charProperties itemCnt="${items.length}">${items.join("")}</hh:charProperties>`;
}

function margin(d: ParaDef, scale: number) {
  const v = (n = 0) => n * scale;
  return `<hh:margin><hc:intent value="${v(d.firstLine)}" unit="HWPUNIT"/><hc:left value="${v(d.left)}" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="${v(
    d.prev,
  )}" unit="HWPUNIT"/><hc:next value="${v(d.next)}" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="${d.lineSpacing}" unit="HWPUNIT"/>`;
}

function paraProperties() {
  const ids = Object.keys(PARA_DEFS).map(Number);
  const items = ids.map((id) => {
    const d = PARA_DEFS[id];
    return `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="${
      d.align
    }" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="${
      d.keepWithNext ? 1 : 0
    }" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">${margin(
      d,
      1,
    )}</hp:case><hp:default>${margin(d, 2)}</hp:default></hp:switch><hh:border borderFillIDRef="${
      BORDER.charDefault
    }" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`;
  });
  return `<hh:paraProperties itemCnt="${items.length}">${items.join("")}</hh:paraProperties>`;
}

const NUMBER_FORMATS = [
  ["DIGIT", "^1."],
  ["HANGUL_SYLLABLE", "^2."],
  ["DIGIT", "^3)"],
  ["HANGUL_SYLLABLE", "^4)"],
  ["DIGIT", "(^5)"],
  ["HANGUL_SYLLABLE", "(^6)"],
  ["CIRCLED_DIGIT", "^7"],
] as const;

function numberings() {
  const heads = NUMBER_FORMATS.map(
    ([fmt, text], i) =>
      `<hh:paraHead start="1" level="${i + 1}" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="${fmt}" charPrIDRef="4294967295" checkable="0">${text}</hh:paraHead>`,
  ).join("");
  return `<hh:numberings itemCnt="1"><hh:numbering id="1" start="0">${heads}</hh:numbering></hh:numberings>`;
}

export function buildHeaderXml(): string {
  return (
    `${XML_DECL}<hh:head ${OWPML_NS} version="1.5" secCnt="1">` +
    `<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>` +
    `<hh:refList>${fontfaces()}${borderFills()}${charProperties()}` +
    `<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>` +
    `${numberings()}${paraProperties()}` +
    `<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="${PARA.body}" charPrIDRef="${CHAR.body}" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>` +
    `</hh:refList>` +
    `<hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>` +
    `<hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>` +
    `<hh:trackchageConfig flags="56"/></hh:head>`
  );
}
