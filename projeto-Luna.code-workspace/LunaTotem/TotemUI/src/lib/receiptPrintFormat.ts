const ESC = "\x1B";
const GS = "\x1D";

const DEFAULT_F4_COLUMNS = 48;

const ESC_POS_F4_PREFIX = `${ESC}@${ESC}a\x00${ESC}M\x01${GS}!\x00`;
const ESC_POS_F4_SUFFIX = "\n\n\n";

function splitLineByColumns(line: string, columns: number): string[] {
  const out: string[] = [];
  let rest = String(line || "");

  if (!rest) return [""];

  while (rest.length > columns) {
    const window = rest.slice(0, columns + 1);
    const breakAt = window.lastIndexOf(" ");
    if (breakAt > 0) {
      out.push(rest.slice(0, breakAt).trimEnd());
      rest = rest.slice(breakAt + 1);
      continue;
    }

    out.push(rest.slice(0, columns));
    rest = rest.slice(columns);
  }

  out.push(rest);
  return out;
}

export function formatF4SpecificReceiptText(rawText: string, columns: number = DEFAULT_F4_COLUMNS): string {
  const input = String(rawText || "");
  if (!input.trim()) return input;

  // Avoid reformatting payloads that already include ESC/POS control bytes.
  if (input.includes("\x1B") || input.includes("\x1D")) {
    return input;
  }

  const safeColumns = Number.isFinite(columns) ? Math.max(16, Math.floor(columns)) : DEFAULT_F4_COLUMNS;
  const normalized = input.replace(/\r\n?/g, "\n");
  const wrapped = normalized
    .split("\n")
    .flatMap((line) => splitLineByColumns(line.replace(/\t/g, "    "), safeColumns))
    .join("\n")
    .trimEnd();

  return `${ESC_POS_F4_PREFIX}${wrapped}${ESC_POS_F4_SUFFIX}`;
}

