import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SentenceAnalysis } from "./AiDetectionScore";

interface TipTapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  onRegenerateSelection?: (selectedText: string) => void;
  regenerating?: boolean;
  editable?: boolean;
  highlightedSentences?: SentenceAnalysis[];
  showHighlights?: boolean;
  onToggleHighlights?: () => void;
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect table block (lines starting with |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseCells = (row: string) =>
          row.split("|").slice(1, -1).map((c) => c.trim());

        const headerCells = parseCells(tableLines[0]);
        // Skip separator row (|---|---|)
        const dataStart = tableLines.length > 1 && /^[\s|:-]+$/.test(tableLines[1].replace(/\|/g, "").replace(/-/g, "").replace(/:/g, "").trim()) ? 2 : 1;

        let html = "<table><thead><tr>";
        headerCells.forEach((c) => {
          let processed = c.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
          html += `<th>${processed}</th>`;
        });
        html += "</tr></thead><tbody>";
        for (let j = dataStart; j < tableLines.length; j++) {
          const cells = parseCells(tableLines[j]);
          html += "<tr>";
          cells.forEach((c) => {
            let processed = c.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
            html += `<td>${processed}</td>`;
          });
          html += "</tr>";
        }
        html += "</tbody></table>";
        result.push(html);
      }
      continue;
    }

    if (line.startsWith("### ")) result.push(`<h3>${line.slice(4)}</h3>`);
    else if (line.startsWith("## ")) result.push(`<h2>${line.slice(3)}</h2>`);
    else if (line.startsWith("# ")) result.push(`<h1>${line.slice(2)}</h1>`);
    else if (line.startsWith("- ") || line.startsWith("* ")) result.push(`<li>${line.slice(2)}</li>`);
    else if (/^\d+\.\s/.test(line)) result.push(`<li>${line.replace(/^\d+\.\s/, "")}</li>`);
    else if (line.trim() === "") result.push("<p></p>");
    else {
      let processed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
      result.push(`<p>${processed}</p>`);
    }
    i++;
  }

  return result.join("");
}

function htmlToMarkdown(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  let md = "";

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join("");

    switch (tag) {
      case "h1": return `# ${children}\n\n`;
      case "h2": return `## ${children}\n\n`;
      case "h3": return `### ${children}\n\n`;
      case "p": return children ? `${children}\n\n` : "\n";
      case "strong": case "b": return `**${children}**`;
      case "em": case "i": return `*${children}*`;
      case "ul": case "ol": return `${children}\n`;
      case "li": return `- ${children}\n`;
      case "br": return "\n";
      case "mark": return children;
      case "table": return `${children}\n`;
      case "thead": case "tbody": return children;
      case "tr": {
        const cells = Array.from(el.children);
        const row = cells.map((c) => processNode(c)).join(" | ");
        const isHeader = cells[0]?.tagName.toLowerCase() === "th";
        let line = `| ${row} |\n`;
        if (isHeader) {
          line += `| ${cells.map(() => "---").join(" | ")} |\n`;
        }
        return line;
      }
      case "th": case "td": return Array.from(el.childNodes).map(processNode).join("");
      default: return children;
    }
  }

  Array.from(div.childNodes).forEach((node) => {
    md += processNode(node);
  });
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

const TipTapEditor = ({
  content,
  onUpdate,
  onRegenerateSelection,
  regenerating,
  editable = true,
  highlightedSentences,
  showHighlights,
  onToggleHighlights,
}: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing..." }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: markdownToHtml(content),
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(htmlToMarkdown(html));
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentMd = htmlToMarkdown(editor.getHTML());
      if (currentMd !== content) {
        editor.commands.setContent(markdownToHtml(content));
      }
    }
  }, [content, editor]);

  // Apply AI sentence highlights
  useEffect(() => {
    if (!editor || !highlightedSentences || !showHighlights) {
      if (editor) {
        // Remove all highlights
        editor.chain().selectAll().unsetHighlight().run();
        // Restore cursor to start
        editor.commands.setTextSelection(0);
      }
      return;
    }

    const text = editor.state.doc.textContent;
    const chain = editor.chain();
    
    // First clear existing highlights
    chain.selectAll().unsetHighlight();

    // Apply highlights for AI sentences
    for (const sentence of highlightedSentences) {
      if (sentence.generated_prob <= 0.4) continue;
      
      const sentenceText = sentence.text.trim();
      if (!sentenceText) continue;
      
      const idx = text.indexOf(sentenceText);
      if (idx === -1) continue;
      
      // +1 because ProseMirror positions are 1-indexed
      const from = idx + 1;
      const to = from + sentenceText.length;
      
      const color = sentence.generated_prob > 0.7 
        ? "rgba(239, 68, 68, 0.2)"   // red for high AI
        : "rgba(234, 179, 8, 0.15)";  // yellow for medium
      
      chain.setTextSelection({ from, to }).setHighlight({ color });
    }

    chain.setTextSelection(0).run();
  }, [editor, highlightedSentences, showHighlights]);

  const handleRegenerate = useCallback(() => {
    if (!editor || !onRegenerateSelection) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (selectedText.trim()) {
      onRegenerateSelection(selectedText);
    }
  }, [editor, onRegenerateSelection]);

  if (!editor) return null;

  const hasSelection = editor.state.selection.from !== editor.state.selection.to;
  const hasHighlightData = highlightedSentences && highlightedSentences.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      {editable && (
        <div className="border-b bg-muted/30 p-2 flex items-center gap-1 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleBold().run()}
                data-active={editor.isActive("bold")}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                data-active={editor.isActive("italic")}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                data-active={editor.isActive("heading", { level: 2 })}
              >
                <Heading2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 2</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                data-active={editor.isActive("heading", { level: 3 })}
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 3</TooltipContent>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()}>
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()}>
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

          {hasHighlightData && onToggleHighlights && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showHighlights ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleHighlights}
                    className="text-xs gap-1"
                  >
                    {showHighlights ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showHighlights ? "Hide AI Highlights" : "Show AI Highlights"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle AI-detected sentence highlighting</TooltipContent>
              </Tooltip>
            </>
          )}

          {onRegenerateSelection && (
            <>
              <div className="flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={!hasSelection || regenerating}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
                    {regenerating ? "Regenerating..." : "Regenerate Selection"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Select text, then click to regenerate that section with AI</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-6 md:p-8 min-h-[400px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[400px]"
      />
    </div>
  );
};

export default TipTapEditor;
