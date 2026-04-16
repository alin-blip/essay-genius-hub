import jsPDF from "jspdf";
import { parseMarkdownBlocks, extractChartSpecs, type ChartSpec } from "./markdown-blocks";
import { renderCharts, type RenderedChart } from "./chart-renderer";

interface ExportOptions {
  title: string;
  moduleName?: string;
  content: string;
  references?: string;
}

const COLORS = {
  headerBg: [26, 54, 93] as [number, number, number],
  altRow: [245, 247, 250] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  text: [20, 20, 20] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export async function exportToPdf(options: ExportOptions) {
  const { title, moduleName, content, references } = options;

  // Pre-fetch chart PNGs
  const specs = extractChartSpecs(content);
  const charts = await renderCharts(specs);
  let chartIdx = 0;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 18;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---- Title ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 20 + 8;

  if (moduleName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(moduleName, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 24;
  }
  y += 24;

  // ---- Content blocks ----
  const blocks = parseMarkdownBlocks(content);
  doc.setFontSize(12);

  const drawTable = (headers: string[], rows: string[][]) => {
    const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
    const colW = contentWidth / colCount;
    const cellPadX = 6;
    const cellPadY = 5;

    // Measure all wrapped lines per cell to compute row heights
    doc.setFontSize(10);
    const wrap = (txt: string, font: "bold" | "normal") => {
      doc.setFont("helvetica", font);
      return doc.splitTextToSize((txt || "").replace(/\*\*/g, ""), colW - cellPadX * 2);
    };

    const headerLines = headers.map((h) => wrap(h, "bold"));
    const headerHeight = Math.max(...headerLines.map((l) => l.length)) * 12 + cellPadY * 2;

    const bodyRowsLines = rows.map((row) =>
      Array.from({ length: colCount }).map((_, c) => wrap(row[c] || "", "normal")),
    );
    const bodyRowHeights = bodyRowsLines.map(
      (rowLines) => Math.max(...rowLines.map((l) => l.length)) * 12 + cellPadY * 2,
    );

    // Page break if header doesn't fit
    ensureSpace(headerHeight + (bodyRowHeights[0] || 20));

    // Header
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(margin, y, contentWidth, headerHeight, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    headers.forEach((_, c) => {
      const lines = headerLines[c];
      const cellX = margin + colW * c;
      doc.text(lines, cellX + cellPadX, y + cellPadY + 9);
    });
    // Header borders
    doc.setDrawColor(...COLORS.border);
    doc.rect(margin, y, contentWidth, headerHeight);
    for (let c = 1; c < colCount; c++) {
      doc.line(margin + colW * c, y, margin + colW * c, y + headerHeight);
    }
    y += headerHeight;
    doc.setTextColor(...COLORS.text);

    // Body rows
    bodyRowsLines.forEach((rowLines, ri) => {
      const rowH = bodyRowHeights[ri];
      // If row doesn't fit, new page + redraw header skipped (keep simple — just paginate)
      if (y + rowH > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      if (ri % 2 === 1) {
        doc.setFillColor(...COLORS.altRow);
        doc.rect(margin, y, contentWidth, rowH, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      rowLines.forEach((lines, c) => {
        const cellX = margin + colW * c;
        doc.text(lines, cellX + cellPadX, y + cellPadY + 9);
      });
      doc.setDrawColor(...COLORS.border);
      doc.rect(margin, y, contentWidth, rowH);
      for (let c = 1; c < colCount; c++) {
        doc.line(margin + colW * c, y, margin + colW * c, y + rowH);
      }
      y += rowH;
    });

    y += 12;
    doc.setFontSize(12);
  };

  const drawChart = (rendered: RenderedChart) => {
    const maxW = contentWidth;
    const scale = Math.min(1, maxW / rendered.width);
    const w = rendered.width * scale;
    const h = rendered.height * scale;
    ensureSpace(h + 16);
    const x = margin + (contentWidth - w) / 2;
    doc.addImage(rendered.data_url, "PNG", x, y, w, h);
    y += h + 16;
  };

  for (const b of blocks) {
    switch (b.kind) {
      case "blank":
        y += 8;
        break;
      case "h2":
        ensureSpace(30);
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        {
          const hLines = doc.splitTextToSize(b.text, contentWidth);
          doc.text(hLines, margin, y);
          y += hLines.length * 18 + 8;
        }
        doc.setFontSize(12);
        break;
      case "h3":
        ensureSpace(26);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        {
          const hLines = doc.splitTextToSize(b.text, contentWidth);
          doc.text(hLines, margin, y);
          y += hLines.length * 17 + 6;
        }
        doc.setFontSize(12);
        break;
      case "paragraph": {
        doc.setFont("helvetica", "normal");
        const cleanLine = b.text.replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
        for (const wl of wrapped) {
          ensureSpace(lineHeight);
          doc.text(wl, margin, y);
          y += lineHeight;
        }
        break;
      }
      case "table":
        drawTable(b.headers, b.rows);
        break;
      case "chart": {
        const rendered = charts[chartIdx++];
        if (rendered) {
          drawChart(rendered);
        } else {
          ensureSpace(lineHeight);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(120);
          doc.text(`[Chart: ${b.spec.title || b.spec.type}]`, pageWidth / 2, y, { align: "center" });
          doc.setTextColor(0);
          doc.setFont("helvetica", "normal");
          y += lineHeight;
        }
        break;
      }
    }
  }

  // ---- References ----
  if (references) {
    ensureSpace(40);
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("References", margin, y);
    y += 24;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const refLines = references.split("\n").filter((l) => l.trim());
    for (const ref of refLines) {
      const clean = ref.replace(/^[-•]\s*/, "");
      const wrapped = doc.splitTextToSize(clean, contentWidth - 36);
      for (let i = 0; i < wrapped.length; i++) {
        ensureSpace(lineHeight);
        const x = i === 0 ? margin : margin + 36;
        doc.text(wrapped[i], x, y);
        y += lineHeight;
      }
      y += 4;
    }
  }

  // ---- Page numbers ----
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(String(i), pageWidth / 2, pageHeight - 36, { align: "center" });
  }

  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}
