import pptxgen from "pptxgenjs";

interface SlideData {
  type: "title" | "content" | "two_column" | "bullet_list" | "quote" | "stats" | "conclusion";
  title: string;
  content: any;
}

// Design tokens — dark blue + gold accent matching AssignmentPro brand
const COLORS = {
  primary: "1a365d",
  accent: "d4a843",
  dark: "0f172a",
  light: "f8fafc",
  muted: "94a3b8",
  white: "FFFFFF",
  bodyBg: "f1f5f9",
};

function addTitleSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.dark };

  // Accent line
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 2.0, w: 1.5, h: 0.06,
    fill: { color: COLORS.accent },
  });

  s.addText(slide.title, {
    x: 0.5, y: 2.2, w: 9, h: 1.2,
    fontSize: 36, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  if (slide.content?.subtitle) {
    s.addText(slide.content.subtitle, {
      x: 0.5, y: 3.5, w: 9, h: 0.6,
      fontSize: 18, fontFace: "Calibri", color: COLORS.muted,
      align: "left",
    });
  }

  if (slide.content?.author) {
    s.addText(slide.content.author, {
      x: 0.5, y: 4.3, w: 9, h: 0.5,
      fontSize: 14, fontFace: "Calibri", color: COLORS.accent,
      align: "left",
    });
  }
}

function addContentSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.light };

  // Header bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  });

  s.addText(slide.title, {
    x: 0.5, y: 0.1, w: 9, h: 0.7,
    fontSize: 22, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  s.addText(slide.content?.text || "", {
    x: 0.5, y: 1.3, w: 9, h: 4.0,
    fontSize: 16, fontFace: "Calibri", color: COLORS.dark,
    align: "left", valign: "top", paraSpaceAfter: 8,
  });
}

function addBulletSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.light };

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  });

  s.addText(slide.title, {
    x: 0.5, y: 0.1, w: 9, h: 0.7,
    fontSize: 22, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  const bullets = (slide.content?.bullets || []).map((b: string) => ({
    text: b,
    options: { bullet: { code: "2022", color: COLORS.accent }, indentLevel: 0 },
  }));

  s.addText(bullets, {
    x: 0.7, y: 1.3, w: 8.6, h: 4.0,
    fontSize: 16, fontFace: "Calibri", color: COLORS.dark,
    valign: "top", paraSpaceAfter: 10,
  });
}

function addTwoColumnSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.light };

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  });

  s.addText(slide.title, {
    x: 0.5, y: 0.1, w: 9, h: 0.7,
    fontSize: 22, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  const left = slide.content?.left;
  const right = slide.content?.right;

  // Left column
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.4, y: 1.2, w: 4.3, h: 4.0, rectRadius: 0.1,
    fill: { color: COLORS.white },
    shadow: { type: "outer", blur: 4, opacity: 0.15, offset: 2, color: "000000" },
  });
  if (left?.title) {
    s.addText(left.title, {
      x: 0.6, y: 1.3, w: 3.9, h: 0.5,
      fontSize: 16, fontFace: "Calibri", color: COLORS.primary,
      bold: true,
    });
  }
  const leftBullets = (left?.bullets || []).map((b: string) => ({
    text: b,
    options: { bullet: { code: "2022", color: COLORS.accent } },
  }));
  s.addText(leftBullets, {
    x: 0.8, y: 1.9, w: 3.7, h: 3.0,
    fontSize: 14, fontFace: "Calibri", color: COLORS.dark,
    valign: "top", paraSpaceAfter: 6,
  });

  // Right column
  s.addShape(pres.ShapeType.roundRect, {
    x: 5.3, y: 1.2, w: 4.3, h: 4.0, rectRadius: 0.1,
    fill: { color: COLORS.white },
    shadow: { type: "outer", blur: 4, opacity: 0.15, offset: 2, color: "000000" },
  });
  if (right?.title) {
    s.addText(right.title, {
      x: 5.5, y: 1.3, w: 3.9, h: 0.5,
      fontSize: 16, fontFace: "Calibri", color: COLORS.primary,
      bold: true,
    });
  }
  const rightBullets = (right?.bullets || []).map((b: string) => ({
    text: b,
    options: { bullet: { code: "2022", color: COLORS.accent } },
  }));
  s.addText(rightBullets, {
    x: 5.5, y: 1.9, w: 3.7, h: 3.0,
    fontSize: 14, fontFace: "Calibri", color: COLORS.dark,
    valign: "top", paraSpaceAfter: 6,
  });
}

function addQuoteSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.primary };

  // Large quote mark
  s.addText("\u201C", {
    x: 0.5, y: 0.5, w: 2, h: 2,
    fontSize: 120, fontFace: "Georgia", color: COLORS.accent,
    bold: true, align: "left",
  });

  s.addText(slide.content?.quote || "", {
    x: 1.0, y: 2.0, w: 8, h: 2.5,
    fontSize: 22, fontFace: "Georgia", color: COLORS.white,
    italic: true, align: "left",
  });

  if (slide.content?.attribution) {
    s.addText(`— ${slide.content.attribution}`, {
      x: 1.0, y: 4.5, w: 8, h: 0.5,
      fontSize: 14, fontFace: "Calibri", color: COLORS.accent,
      align: "left",
    });
  }
}

function addStatsSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.light };

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: COLORS.primary },
  });

  s.addText(slide.title, {
    x: 0.5, y: 0.1, w: 9, h: 0.7,
    fontSize: 22, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  const stats = slide.content?.stats || [];
  const count = Math.min(stats.length, 4);
  const cardW = (9 - (count - 1) * 0.3) / count;

  stats.slice(0, 4).forEach((stat: any, i: number) => {
    const x = 0.5 + i * (cardW + 0.3);

    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.5, w: cardW, h: 3.0, rectRadius: 0.1,
      fill: { color: COLORS.white },
      shadow: { type: "outer", blur: 4, opacity: 0.15, offset: 2, color: "000000" },
    });

    s.addText(stat.value, {
      x, y: 1.8, w: cardW, h: 1.2,
      fontSize: 36, fontFace: "Calibri", color: COLORS.accent,
      bold: true, align: "center",
    });

    s.addText(stat.label, {
      x, y: 3.0, w: cardW, h: 1.0,
      fontSize: 13, fontFace: "Calibri", color: COLORS.dark,
      align: "center", valign: "top",
    });
  });
}

function addConclusionSlide(pres: pptxgen, slide: SlideData) {
  const s = pres.addSlide();
  s.background = { color: COLORS.dark };

  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 1.0, w: 1.5, h: 0.06,
    fill: { color: COLORS.accent },
  });

  s.addText(slide.title, {
    x: 0.5, y: 1.2, w: 9, h: 0.8,
    fontSize: 28, fontFace: "Calibri", color: COLORS.white,
    bold: true, align: "left",
  });

  const bullets = (slide.content?.bullets || []).map((b: string) => ({
    text: b,
    options: { bullet: { code: "2022", color: COLORS.accent } },
  }));

  s.addText(bullets, {
    x: 0.7, y: 2.2, w: 8.6, h: 2.5,
    fontSize: 16, fontFace: "Calibri", color: COLORS.light,
    valign: "top", paraSpaceAfter: 10,
  });

  if (slide.content?.closing) {
    s.addText(slide.content.closing, {
      x: 0.5, y: 4.8, w: 9, h: 0.5,
      fontSize: 14, fontFace: "Calibri", color: COLORS.accent,
      italic: true, align: "left",
    });
  }
}

export async function exportToPptx(slides: SlideData[], title: string): Promise<void> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "AssignmentPro";
  pres.title = title;

  for (const slide of slides) {
    switch (slide.type) {
      case "title":
        addTitleSlide(pres, slide);
        break;
      case "content":
        addContentSlide(pres, slide);
        break;
      case "bullet_list":
        addBulletSlide(pres, slide);
        break;
      case "two_column":
        addTwoColumnSlide(pres, slide);
        break;
      case "quote":
        addQuoteSlide(pres, slide);
        break;
      case "stats":
        addStatsSlide(pres, slide);
        break;
      case "conclusion":
        addConclusionSlide(pres, slide);
        break;
      default:
        addContentSlide(pres, slide);
    }
  }

  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;
  await pres.writeFile({ fileName: filename });
}
