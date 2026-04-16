// Shared markdown block parser used by DOCX/PDF/editor for tables and [CHART:...] tokens.
// Keeps export logic consistent between formats.

export type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "blank" }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "chart"; spec: ChartSpec };

export interface ChartSpec {
  type: "bar" | "line" | "pie" | "doughnut";
  title?: string;
  labels: string[];
  datasets: Array<{ label?: string; data: number[] }>;
}

const CHART_TOKEN = /\[CHART:([^\]]+)\]/i;

/**
 * Markdown table detection — a row is a line whose trimmed value starts AND ends with `|`.
 * Separator rows (|---|---|) are skipped.
 */
function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isSeparator(line: string): boolean {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\||\|$/g, "");
  return t.split("|").map((c) => c.trim());
}

function tryParseChart(line: string): ChartSpec | null {
  const m = line.match(CHART_TOKEN);
  if (!m) return null;
  try {
    // Allow either raw JSON or JSON5-ish; we require JSON
    const spec = JSON.parse(m[1]);
    if (!spec.type || !Array.isArray(spec.labels) || !Array.isArray(spec.datasets)) return null;
    return spec as ChartSpec;
  } catch {
    return null;
  }
}

export function parseMarkdownBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      blocks.push({ kind: "blank" });
      i++;
      continue;
    }

    // Chart token (whole line)
    const chart = tryParseChart(trimmed);
    if (chart) {
      blocks.push({ kind: "chart", spec: chart });
      i++;
      continue;
    }

    // Table — needs at least header + separator
    if (isTableLine(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const headers = splitRow(line);
      const rows: string[][] = [];
      i += 2; // skip header + separator
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", headers, rows });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.replace(/^##\s+/, "") });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.replace(/^###\s+/, "") });
      i++;
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
    i++;
  }
  return blocks;
}

/**
 * Extract all unique chart specs from content so callers can pre-fetch PNGs.
 */
export function extractChartSpecs(content: string): ChartSpec[] {
  const blocks = parseMarkdownBlocks(content);
  return blocks.filter((b): b is Extract<Block, { kind: "chart" }> => b.kind === "chart").map((b) => b.spec);
}
