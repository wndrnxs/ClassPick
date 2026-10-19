/**
 * 지문 서식 ↔ HTML (브라우저 전용: DOM API 사용)
 *
 * - 붙여넣은 HTML(한글·워드·구글 문서·웹 페이지)에서 굵게·밑줄·네모 박스만 남기고 나머지 서식은 버립니다.
 * - 지문 편집기(contentEditable)의 내용을 서식 표기로 바꾸고, 커서 위치를 글자 번호로 주고받습니다.
 */
import { cleanPastedRuns, parseRich, type RichRun } from "./rich-text";

const BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "CENTER", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE",
  "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "TABLE", "TBODY", "TFOOT", "THEAD", "TR", "UL", "CAPTION",
]);
const SKIP = new Set(["SCRIPT", "STYLE", "HEAD", "TITLE", "META", "LINK", "TEMPLATE", "NOSCRIPT", "IMG", "SVG", "svg", "OBJECT", "IFRAME", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);

/** 한 칸짜리 짧은 표는 「네모 박스」로 봅니다 (한글에서 낱말에 상자를 칠 때 흔히 쓰는 방식). */
const BOX_TABLE_MAX = 40;

type Marks = { b: boolean; u: boolean; box: boolean };
export type DomPoint = { node: Node; offset: number };

function isBlock(el: Element) {
  return BLOCK.has(el.tagName.toUpperCase());
}

function hasBorder(style: CSSStyleDeclaration) {
  return (["Top", "Right", "Bottom", "Left"] as const).some((side) => {
    const s = style.getPropertyValue(`border-${side.toLowerCase()}-style`);
    const w = style.getPropertyValue(`border-${side.toLowerCase()}-width`);
    return s && s !== "none" && s !== "hidden" && !/^0(\.0+)?[a-z]*$/.test(w);
  });
}

function boxTableText(el: Element): string | null {
  if (el.tagName !== "TABLE") return null;
  const cells = el.querySelectorAll("td, th");
  if (cells.length !== 1) return null;
  const text = (cells[0].textContent ?? "").replace(/\s+/g, " ").trim();
  return text && text.length <= BOX_TABLE_MAX ? text : null;
}

function marksOf(el: Element, parent: Marks): Marks {
  const tag = el.tagName.toUpperCase();
  const style = (el as HTMLElement).style as CSSStyleDeclaration | undefined;
  const weight = style?.fontWeight ?? "";
  const bold = weight
    ? weight === "bold" || weight === "bolder" || Number(weight) >= 600
    : parent.b || ["B", "STRONG", "H1", "H2", "H3", "H4", "H5", "H6", "TH"].includes(tag);
  const deco = `${style?.textDecorationLine ?? ""} ${style?.textDecoration ?? ""}`;
  const underline = parent.u || tag === "U" || tag === "INS" || deco.includes("underline");
  const box =
    parent.box ||
    el.classList.contains("rich-box") ||
    (!isBlock(el) && tag !== "TD" && tag !== "TH" && !!style && hasBorder(style));
  return { b: bold, u: underline, box };
}

/**
 * DOM → 서식 구간.
 * pre: 편집기처럼 공백을 그대로 둘지(true), 붙여넣은 HTML처럼 공백을 HTML 규칙으로 다룰지(false).
 * points: 글자 번호로 바꿀 DOM 위치(선택 영역 등). 찾지 못하면 -1.
 */
export function domToRuns(root: Node, { pre, points = [] }: { pre: boolean; points?: DomPoint[] }) {
  const runs: RichRun[] = [];
  const at = points.map(() => -1);
  let length = 0;
  let lastChar = "";

  const push = (text: string, m: Marks) => {
    if (!text) return;
    const prev = runs[runs.length - 1];
    if (prev && !!prev.b === m.b && !!prev.u === m.u && !!prev.box === m.box) prev.text += text;
    else runs.push({ text, ...(m.b && { b: true }), ...(m.u && { u: true }), ...(m.box && { box: true }) });
    length += text.length;
    lastChar = text[text.length - 1];
  };
  const lineBreak = () => {
    if (length > 0 && lastChar !== "\n") push("\n", { b: false, u: false, box: false });
  };
  const mark = (node: Node, offset: number, base: number) => {
    points.forEach((p, i) => {
      if (p.node === node && p.offset === offset) at[i] = base;
    });
  };
  // 블록 끝의 <br>은 빈 줄을 만들지 않는 자리 표시입니다 (브라우저 편집기 관례).
  const isTrailingBr = (br: Node) => {
    let n: Node = br;
    for (;;) {
      let next = n.nextSibling;
      while (next && next.nodeType === Node.TEXT_NODE && !next.textContent) next = next.nextSibling;
      if (next) return false;
      const parent = n.parentNode;
      if (!parent || parent === root || (parent.nodeType === Node.ELEMENT_NODE && isBlock(parent as Element))) return true;
      n = parent;
    }
  };

  const walk = (node: Node, m: Marks, keepSpace: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? "";
      if (keepSpace) {
        mark(node, 0, length);
        const before = length;
        push(pre ? raw.replace(/ /g, " ") : raw.replace(/ /g, " ").replace(/\r\n?/g, "\n"), m);
        for (let i = 1; i <= raw.length; i++) mark(node, i, before + i);
      } else {
        // HTML 공백 규칙: 이어진 공백은 하나로, 줄 첫머리 공백은 버림 (문단 사이 소스 줄바꿈이 빈 줄이 되지 않도록)
        const text = raw.replace(/[ \t\n\r\f]+/g, " ");
        push(length === 0 || lastChar === "\n" ? text.replace(/^ /, "") : text, m);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName?.toUpperCase();
    if (tag && SKIP.has(tag)) return;
    if (tag === "BR") {
      if ((el as HTMLElement).dataset?.ph === undefined && !(isTrailingBr(el) && lastChar !== "\n" && length > 0)) push("\n", { b: false, u: false, box: false });
      return;
    }
    let marks = m;
    let keep = keepSpace;
    if (tag && node !== root) {
      const style = (el as HTMLElement).style as CSSStyleDeclaration | undefined;
      if (style?.display === "none" || /mso-hide\s*:\s*all/i.test(el.getAttribute("style") ?? "")) return;
      const boxText = boxTableText(el);
      if (boxText) {
        push(boxText, { ...m, box: true });
        return;
      }
      marks = marksOf(el, m);
      keep = keepSpace || tag === "PRE" || (style?.whiteSpace ?? "").startsWith("pre") || style?.whiteSpace === "break-spaces";
      if (isBlock(el)) lineBreak();
      if ((tag === "TD" || tag === "TH") && el.previousElementSibling) push(" ", { b: false, u: false, box: false });
    }
    const kids = node.childNodes;
    for (let i = 0; i < kids.length; i++) {
      mark(node, i, length);
      walk(kids[i], marks, keep);
    }
    mark(node, kids.length, length);
    if (tag && node !== root && isBlock(el)) lineBreak();
  };

  walk(root, { b: false, u: false, box: false }, pre);
  return { runs, points: at, length };
}

/** 클립보드 HTML → 서식 구간 (굵게·밑줄·네모 박스만 유지) */
export function htmlToRuns(html: string): RichRun[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return cleanPastedRuns(domToRuns(doc.body, { pre: false }).runs);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 서식 표기 → 편집기 HTML (줄바꿈은 <br>) */
export function markupToEditorHtml(markup: string): string {
  const html = parseRich(markup)
    .map((r) => {
      let h = escapeHtml(r.text).replace(/\n/g, "<br>");
      if (r.u) h = `<u>${h}</u>`;
      if (r.b) h = `<b>${h}</b>`;
      if (r.box) h = `<span class="rich-box">${h}</span>`;
      return h;
    })
    .join("");
  // 마지막 줄바꿈 뒤에도 커서가 놓이도록 자리 표시 <br>을 둡니다.
  return /\n$/.test(markup) ? `${html}<br data-ph="">` : html;
}

/** 글자 번호 → 편집기 DOM 위치 (markupToEditorHtml로 그린 내용 기준) */
export function pointAt(root: Node, index: number): DomPoint {
  let acc = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const len = n.textContent?.length ?? 0;
      if (index <= acc + len) return { node: n, offset: index - acc };
      acc += len;
    } else if ((n as Element).tagName === "BR" && (n as HTMLElement).dataset.ph === undefined) {
      if (index <= acc) return pointBefore(n);
      acc += 1;
      if (index === acc) return pointAfter(n);
    }
  }
  return { node: root, offset: root.childNodes.length };
}

const indexIn = (n: Node) => Array.prototype.indexOf.call(n.parentNode!.childNodes, n) as number;
const pointBefore = (n: Node): DomPoint => ({ node: n.parentNode!, offset: indexIn(n) });
const pointAfter = (n: Node): DomPoint => ({ node: n.parentNode!, offset: indexIn(n) + 1 });
