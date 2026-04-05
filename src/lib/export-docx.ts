import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Footer,
  PageNumber,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";

interface ExportOptions {
  title: string;
  moduleName?: string;
  content: string;
  references?: string;
}

function parseMarkdownToParagraphs(content: string): Paragraph[] {
  const lines = content.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 240 },
          children: [
            new TextRun({
              text: line.replace("## ", ""),
              bold: true,
              font: "Arial",
              size: 28, // 14pt
            }),
          ],
        })
      );
      continue;
    }

    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 180 },
          children: [
            new TextRun({
              text: line.replace("### ", ""),
              bold: true,
              font: "Arial",
              size: 26, // 13pt
            }),
          ],
        })
      );
      continue;
    }

    // Parse inline bold markers **text**
    const runs: TextRun[] = [];
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(
          new TextRun({
            text: part.replace(/\*\*/g, ""),
            bold: true,
            font: "Arial",
            size: 24,
          })
        );
      } else if (part) {
        runs.push(
          new TextRun({
            text: part,
            font: "Arial",
            size: 24, // 12pt
          })
        );
      }
    }

    paragraphs.push(
      new Paragraph({
        spacing: { line: 360, after: 120 }, // 1.5 line spacing (240 * 1.5 = 360)
        alignment: AlignmentType.JUSTIFIED,
        children: runs,
      })
    );
  }

  return paragraphs;
}

function parseReferences(refs: string): Paragraph[] {
  if (!refs) return [];

  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 480, after: 240 },
      children: [
        new TextRun({
          text: "References",
          bold: true,
          font: "Arial",
          size: 28,
        }),
      ],
    }),
  ];

  const lines = refs.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 120, line: 360 },
        indent: { left: 720, hanging: 720 }, // Hanging indent for Harvard style
        children: [
          new TextRun({
            text: line.replace(/^[-•]\s*/, ""),
            font: "Arial",
            size: 24,
          }),
        ],
      })
    );
  }

  return paragraphs;
}

export async function exportToDocx(options: ExportOptions) {
  const { title, moduleName, content, references } = options;

  const contentParagraphs = parseMarkdownToParagraphs(content);
  const refParagraphs = references ? parseReferences(references) : [];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 24 },
        },
      },
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
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 20 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: title,
                bold: true,
                font: "Arial",
                size: 32, // 16pt
              }),
            ],
          }),
          // Module name
          ...(moduleName
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 480 },
                  children: [
                    new TextRun({
                      text: moduleName,
                      font: "Arial",
                      size: 24,
                      color: "666666",
                    }),
                  ],
                }),
              ]
            : [new Paragraph({ spacing: { after: 480 }, children: [] })]),
          // Content
          ...contentParagraphs,
          // References
          ...refParagraphs,
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
  saveAs(buffer, filename);
}
