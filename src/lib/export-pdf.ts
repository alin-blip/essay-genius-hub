import jsPDF from "jspdf";

interface ExportOptions {
  title: string;
  moduleName?: string;
  content: string;
  references?: string;
}

export function exportToPdf(options: ExportOptions) {
  const { title, moduleName, content, references } = options;

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72; // 1 inch
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 18; // 1.5 spacing for 12pt
  let y = margin;

  const addPageIfNeeded = (requiredSpace: number = lineHeight * 2) => {
    if (y + requiredSpace > pageHeight - margin) {
      // Page number before new page
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const pageNum = String(doc.getNumberOfPages());
      doc.text(pageNum, pageWidth / 2, pageHeight - 36, { align: "center" });

      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 20 + 8;

  // Module
  if (moduleName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(moduleName, pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 24;
  }

  y += 24; // space after header

  // Content
  const lines = content.split("\n");
  doc.setFontSize(12);

  for (const line of lines) {
    if (line.trim() === "") {
      y += 8;
      continue;
    }

    if (line.startsWith("## ")) {
      addPageIfNeeded(30);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const heading = line.replace("## ", "");
      const hLines = doc.splitTextToSize(heading, contentWidth);
      doc.text(hLines, margin, y);
      y += hLines.length * 18 + 8;
      doc.setFontSize(12);
      continue;
    }

    if (line.startsWith("### ")) {
      addPageIfNeeded(26);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      const heading = line.replace("### ", "");
      const hLines = doc.splitTextToSize(heading, contentWidth);
      doc.text(hLines, margin, y);
      y += hLines.length * 17 + 6;
      doc.setFontSize(12);
      continue;
    }

    // Bold line
    if (line.startsWith("**") && line.endsWith("**")) {
      addPageIfNeeded();
      doc.setFont("helvetica", "bold");
      const text = line.replace(/\*\*/g, "");
      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wl of wrapped) {
        addPageIfNeeded();
        doc.text(wl, margin, y);
        y += lineHeight;
      }
      doc.setFont("helvetica", "normal");
      continue;
    }

    // Normal paragraph — strip inline bold markers for PDF
    doc.setFont("helvetica", "normal");
    const cleanLine = line.replace(/\*\*/g, "");
    const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
    for (const wl of wrapped) {
      addPageIfNeeded();
      doc.text(wl, margin, y);
      y += lineHeight;
    }
  }

  // References
  if (references) {
    addPageIfNeeded(40);
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
        addPageIfNeeded();
        // Hanging indent: first line at margin, rest indented
        const x = i === 0 ? margin : margin + 36;
        doc.text(wrapped[i], x, y);
        y += lineHeight;
      }
      y += 4;
    }
  }

  // Last page number
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
