import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Footer,
  PageNumber,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import { parseMarkdownBlocks, extractChartSpecs, type Block, type ChartSpec } from "./markdown-blocks";
import { renderCharts, dataUrlToUint8Array, type RenderedChart } from "./chart-renderer";

interface ExportOptions {
  title: string;
  moduleName?: string;
  content: string;
  references?: string;
}

// A4 portrait: 11906 x 16838 DXA. Content width with 1" (1440) margins = 9026.
const CONTENT_WIDTH_DXA = 9026;
const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const TABLE_BORDERS = { top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER };

function inlineRuns(text: string, opts?: { bold?: boolean }): TextRun[] {
  // Parse **bold** markers
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, font: "Arial", size: 24 }));
    } else {
      runs.push(new TextRun({ text: part, bold: opts?.bold, font: "Arial", size: 24 }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: " ", font: "Arial", size: 24 })];
}

function buildTable(headers: string[], rows: string[][]): Table {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const colWidth = Math.floor(CONTENT_WIDTH_DXA / colCount);
  const columnWidths = Array(colCount).fill(colWidth);

  const headerRow = new TableRow({
    tableHeader: true,
    children: Array.from({ length: colCount }).map((_, c) => {
      const text = headers[c] ?? "";
      return new TableCell({
        borders: TABLE_BORDERS,
        width: { size: colWidth, type: WidthType.DXA },
        shading: { fill: "1A365D", type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: text.replace(/\*\*/g, ""), bold: true, font: "Arial", size: 22, color: "FFFFFF" }),
            ],
          }),
        ],
      });
    }),
  });

  const bodyRows = rows.map(
    (row, ri) =>
      new TableRow({
        children: Array.from({ length: colCount }).map((_, c) => {
          const text = row[c] ?? "";
          return new TableCell({
            borders: TABLE_BORDERS,
            width: { size: colWidth, type: WidthType.DXA },
            shading: ri % 2 === 1 ? { fill: "F5F7FA", type: ShadingType.CLEAR, color: "auto" } : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: inlineRuns(text) })],
          });
        }),
      }),
  );

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...bodyRows],
  });
}

function buildChartParagraph(rendered: RenderedChart): Paragraph {
  const data = dataUrlToUint8Array(rendered.data_url);
  // Scale to fit content width (9026 DXA ≈ 6.27in ≈ 602px at 96dpi). Keep aspect ratio.
  const maxWidth = 540;
  const scale = Math.min(1, maxWidth / rendered.width);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
    children: [
      new ImageRun({
        type: "png",
        data,
        transformation: {
          width: Math.round(rendered.width * scale),
          height: Math.round(rendered.height * scale),
        },
        altText: { title: rendered.spec.title || "Chart", description: rendered.spec.title || "Chart", name: "chart" },
      }),
    ],
  });
}

function blocksToDocxNodes(
  blocks: Block[],
  charts: RenderedChart[],
): Array<Paragraph | Table> {
  const nodes: Array<Paragraph | Table> = [];
  let chartIdx = 0;

  for (const b of blocks) {
    switch (b.kind) {
      case "blank":
        nodes.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case "h2":
        nodes.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 360, after: 240 },
            children: [new TextRun({ text: b.text, bold: true, font: "Arial", size: 28 })],
          }),
        );
        break;
      case "h3":
        nodes.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 180 },
            children: [new TextRun({ text: b.text, bold: true, font: "Arial", size: 26 })],
          }),
        );
        break;
      case "paragraph":
        nodes.push(
          new Paragraph({
            spacing: { line: 360, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
            children: inlineRuns(b.text),
          }),
        );
        break;
      case "table":
        nodes.push(buildTable(b.headers, b.rows));
        nodes.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case "chart": {
        const rendered = charts[chartIdx++];
        if (rendered) {
          nodes.push(buildChartParagraph(rendered));
        } else {
          // Fallback: textual placeholder if rendering failed
          nodes.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `[Chart: ${b.spec.title || b.spec.type}]`,
                  italics: true,
                  font: "Arial",
                  size: 22,
                  color: "666666",
                }),
              ],
            }),
          );
        }
        break;
      }
    }
  }
  return nodes;
}

function buildReferences(refs: string): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 480, after: 240 },
      children: [new TextRun({ text: "References", bold: true, font: "Arial", size: 28 })],
    }),
  ];
  const lines = refs.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 120, line: 360 },
        indent: { left: 720, hanging: 720 },
        children: [new TextRun({ text: line.replace(/^[-•]\s*/, ""), font: "Arial", size: 24 })],
      }),
    );
  }
  return paragraphs;
}

export async function exportToDocx(options: ExportOptions) {
  const { title, moduleName, content, references } = options;

  // Render any charts in the content as PNGs (parallel network calls)
  const specs = extractChartSpecs(content);
  const charts = await renderCharts(specs);

  const blocks = parseMarkdownBlocks(content);
  const contentNodes = blocksToDocxNodes(blocks, charts);
  const refParagraphs = references ? buildReferences(references) : [];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 20 })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: title, bold: true, font: "Arial", size: 32 })],
          }),
          ...(moduleName
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 480 },
                  children: [new TextRun({ text: moduleName, font: "Arial", size: 24, color: "666666" })],
                }),
              ]
            : [new Paragraph({ spacing: { after: 480 }, children: [] })]),
          ...contentNodes,
          ...refParagraphs,
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  saveAs(buffer, filename);
}
