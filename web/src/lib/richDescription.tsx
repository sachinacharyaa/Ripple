import { Fragment, type ReactNode } from "react";

/** Delimiters written around typed text when B / I / U modes are active (longest combos first for parsing). */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["***__", "__***"],
  ["**__", "__**"],
  ["*__", "__*"],
  ["***", "***"],
  ["**", "**"],
  ["__", "__"],
  ["*", "*"],
];

export function wrappingDelims(active: { b: boolean; i: boolean; u: boolean }): { open: string; close: string } {
  const b = active.b;
  const i = active.i;
  const u = active.u;
  if (b && i && u) return { open: "***__", close: "__***" };
  if (b && i) return { open: "***", close: "***" };
  if (b && u) return { open: "**__", close: "__**" };
  if (i && u) return { open: "*__", close: "__*" };
  if (b) return { open: "**", close: "**" };
  if (i) return { open: "*", close: "*" };
  if (u) return { open: "__", close: "__" };
  return { open: "", close: "" };
}

function findNextOpen(s: string, from: number): { open: string; close: string; idx: number } | null {
  let best: { open: string; close: string; idx: number } | null = null;
  for (let i = from; i < s.length; i++) {
    for (const [open, close] of PAIRS) {
      if (s.slice(i, i + open.length) !== open) continue;
      if (!best || i < best.idx || (i === best.idx && open.length > best.open.length)) {
        best = { open, close, idx: i };
      }
    }
  }
  return best;
}

function wrapByOpen(open: string, inner: ReactNode, nk: () => string): ReactNode {
  const k = nk();
  switch (open) {
    case "***__":
      return (
        <strong key={k}>
          <em>
            <u>{inner}</u>
          </em>
        </strong>
      );
    case "**__":
      return (
        <strong key={k}>
          <u>{inner}</u>
        </strong>
      );
    case "*__":
      return (
        <em key={k}>
          <u>{inner}</u>
        </em>
      );
    case "***":
      return (
        <strong key={k}>
          <em>{inner}</em>
        </strong>
      );
    case "**":
      return <strong key={k}>{inner}</strong>;
    case "__":
      return <u key={k}>{inner}</u>;
    case "*":
      return <em key={k}>{inner}</em>;
    default:
      return <Fragment key={k}>{inner}</Fragment>;
  }
}

function parseSegment(s: string, nk: () => string): ReactNode[] {
  const out: ReactNode[] = [];
  let pos = 0;
  while (pos < s.length) {
    const next = findNextOpen(s, pos);
    if (!next) {
      out.push(s.slice(pos));
      break;
    }
    if (next.idx > pos) {
      out.push(s.slice(pos, next.idx));
    }
    const closeIdx = s.indexOf(next.close, next.idx + next.open.length);
    if (closeIdx < 0) {
      out.push(s.slice(next.idx));
      break;
    }
    const inner = s.slice(next.idx + next.open.length, closeIdx);
    const innerParsed = parseSegment(inner, nk);
    const innerNode =
      innerParsed.length === 0 ? "" : innerParsed.length === 1 ? innerParsed[0] : <>{innerParsed}</>;
    out.push(wrapByOpen(next.open, innerNode, nk));
    pos = closeIdx + next.close.length;
  }
  return out;
}

/** Renders description with B/I/U markdown from the dashboard editor (including combined ***__…__***). */
export function FormatProductDescription({ text }: { text: string }): ReactNode {
  if (!text) return null;
  let key = 0;
  const nk = () => `rd-${key++}`;

  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {lineIdx > 0 ? <br /> : null}
          {parseSegment(line, nk)}
        </Fragment>
      ))}
    </>
  );
}
