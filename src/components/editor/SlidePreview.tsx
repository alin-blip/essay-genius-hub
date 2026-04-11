import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, ChevronLeft, ChevronRight, Pencil, Check, X, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { PptxTheme } from "@/lib/pptx-themes";

interface SlideData {
  type: string;
  title: string;
  content: any;
  image_prompt?: string;
  image_data?: string;
}

interface SlidePreviewProps {
  open: boolean;
  slides: SlideData[];
  theme: PptxTheme;
  onClose: () => void;
  onExport: (slides: SlideData[]) => void;
  exporting?: boolean;
}

/* ── Slide renderer (used for both main canvas & thumbnails) ── */
function SlideCanvas({ slide, theme, className, isThumbnail }: {
  slide: SlideData;
  theme: PptxTheme;
  className?: string;
  isThumbnail?: boolean;
}) {
  const isDark = slide.type === "title" || slide.type === "conclusion" || slide.type === "quote";
  const t = (px: number) => isThumbnail ? px * 0.35 : px;

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ backgroundColor: `#${isDark ? theme.colors.dark : theme.colors.light}` }}
    >
      {/* Header bar for non-dark slides */}
      {!isDark && (
        <div
          className="flex items-center"
          style={{
            backgroundColor: `#${theme.colors.primary}`,
            height: isThumbnail ? 6 : 40,
            paddingLeft: isThumbnail ? 4 : 24,
          }}
        >
          <span
            className="font-semibold truncate"
            style={{
              color: `#${theme.colors.white}`,
              fontSize: isThumbnail ? 5 : 15,
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </span>
        </div>
      )}

      {/* Slide body */}
      <div
        style={{
          padding: isThumbnail ? "4px 5px" : "24px 32px",
          paddingTop: isDark ? (isThumbnail ? 10 : 48) : (isThumbnail ? 3 : 16),
        }}
      >
        {/* Title slide */}
        {slide.type === "title" && (
          <div className="flex flex-col justify-center" style={{ gap: isThumbnail ? 2 : 12 }}>
            <div style={{ height: isThumbnail ? 2 : 5, width: isThumbnail ? 16 : 80, borderRadius: 4, backgroundColor: `#${theme.colors.accent}` }} />
            <h2 className="font-bold leading-tight" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 8 : 28 }}>
              {slide.title}
            </h2>
            {slide.content?.subtitle && (
              <p style={{ color: `#${theme.colors.muted}`, fontSize: isThumbnail ? 5 : 14 }}>{slide.content.subtitle}</p>
            )}
            {slide.content?.author && (
              <p style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 1 : 8 }}>{slide.content.author}</p>
            )}
          </div>
        )}

        {/* Conclusion */}
        {slide.type === "conclusion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 2 : 10 }}>
            <div style={{ height: isThumbnail ? 2 : 5, width: isThumbnail ? 16 : 80, borderRadius: 4, backgroundColor: `#${theme.colors.accent}` }} />
            <h2 className="font-bold" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 7 : 22 }}>{slide.title}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1 : 6, marginTop: isThumbnail ? 1 : 8 }}>
              {slide.content?.bullets?.map((b: string, i: number) => (
                <p key={i} className="flex items-start" style={{ color: `#${theme.colors.light}`, fontSize: isThumbnail ? 4 : 13, gap: isThumbnail ? 2 : 8 }}>
                  <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 2 : 6, height: isThumbnail ? 2 : 6, marginTop: isThumbnail ? 1 : 4 }} />
                  {b}
                </p>
              ))}
            </div>
            {slide.content?.closing && (
              <p className="italic" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 1 : 8 }}>{slide.content.closing}</p>
            )}
          </div>
        )}

        {/* Quote */}
        {slide.type === "quote" && (
          <div
            className="flex flex-col justify-center rounded-lg"
            style={{
              backgroundColor: `#${theme.colors.primary}`,
              padding: isThumbnail ? 4 : 28,
              marginTop: isThumbnail ? 2 : 12,
            }}
          >
            <span className="font-serif leading-none" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 14 : 56 }}>"</span>
            <p className="italic leading-relaxed" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 5 : 16, marginTop: isThumbnail ? 0 : 4 }}>{slide.content?.quote}</p>
            {slide.content?.attribution && (
              <p className="font-medium" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 2 : 16 }}>— {slide.content.attribution}</p>
            )}
          </div>
        )}

        {/* Content / image_content */}
        {(slide.type === "content" || slide.type === "image_content") && (
          <div className="flex" style={{ gap: isThumbnail ? 3 : 16 }}>
            <p className="leading-relaxed flex-1" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 5 : 14 }}>
              {slide.content?.text}
            </p>
            {slide.image_data && (
              <div className="shrink-0 rounded-lg overflow-hidden shadow-md" style={{ width: isThumbnail ? "30%" : "35%", border: `1px solid #${theme.colors.muted}40` }}>
                <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Bullet list */}
        {slide.type === "bullet_list" && (
          <div className="flex" style={{ gap: isThumbnail ? 3 : 16 }}>
            <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1.5 : 8 }}>
              {slide.content?.bullets?.map((b: string, i: number) => (
                <p key={i} className="flex items-start" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 5 : 14, gap: isThumbnail ? 2 : 8 }}>
                  <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 2 : 6, height: isThumbnail ? 2 : 6, marginTop: isThumbnail ? 1 : 5 }} />
                  {b}
                </p>
              ))}
            </div>
            {slide.image_data && (
              <div className="shrink-0 rounded-lg overflow-hidden shadow-md" style={{ width: isThumbnail ? "30%" : "35%", border: `1px solid #${theme.colors.muted}40` }}>
                <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {slide.type === "stats" && (
          <div className="flex" style={{ gap: isThumbnail ? 2 : 12, marginTop: isThumbnail ? 2 : 12 }}>
            {slide.content?.stats?.slice(0, 4).map((st: any, i: number) => (
              <div
                key={i}
                className="flex-1 rounded-lg text-center shadow-sm"
                style={{
                  backgroundColor: `#${theme.colors.white}`,
                  border: `1px solid #${theme.colors.muted}30`,
                  padding: isThumbnail ? 2 : 16,
                }}
              >
                <p className="font-bold" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 6 : 24 }}>{st.value}</p>
                <p className="leading-tight" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 3 : 11, marginTop: isThumbnail ? 1 : 4 }}>{st.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Two column */}
        {slide.type === "two_column" && (
          <div className="grid grid-cols-2" style={{ gap: isThumbnail ? 2 : 12, marginTop: isThumbnail ? 1 : 8 }}>
            {(["left", "right"] as const).map((side) => (
              <div
                key={side}
                className="rounded-lg shadow-sm"
                style={{ backgroundColor: `#${theme.colors.white}`, border: `1px solid #${theme.colors.muted}30`, padding: isThumbnail ? 3 : 16 }}
              >
                <p className="font-semibold" style={{ color: `#${theme.colors.primary}`, fontSize: isThumbnail ? 4 : 13, marginBottom: isThumbnail ? 1 : 8 }}>{slide.content?.[side]?.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1 : 4 }}>
                  {slide.content?.[side]?.bullets?.map((b: string, i: number) => (
                    <p key={i} className="flex items-start" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 3 : 11, gap: isThumbnail ? 1 : 6 }}>
                      <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 1.5 : 5, height: isThumbnail ? 1.5 : 5, marginTop: isThumbnail ? 1 : 3 }} />
                      {b}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SlidePreview({ open, slides: initialSlides, theme, onClose, onExport, exporting }: SlidePreviewProps) {
  const [slides, setSlides] = useState<SlideData[]>(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    setSlides(initialSlides);
    setCurrentSlide(0);
    setEditingTitle(false);
    setEditingContent(false);
  }, [initialSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (editingTitle || editingContent) return;
      if (e.key === "ArrowLeft") setCurrentSlide((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrentSlide((c) => Math.min(slides.length - 1, c + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, slides.length, editingTitle, editingContent]);

  const slide = slides[currentSlide];
  if (!slide) return null;

  const updateSlide = (index: number, updates: Partial<SlideData>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    if (currentSlide >= slides.length - 1) setCurrentSlide(Math.max(0, slides.length - 2));
  };

  const getContentPreview = (s: SlideData): string => {
    const c = s.content;
    if (!c) return "";
    if (c.text) return c.text;
    if (c.subtitle) return c.subtitle;
    if (c.bullets) return c.bullets.join("\n");
    if (c.quote) return `"${c.quote}"`;
    if (c.stats) return c.stats.map((st: any) => `${st.value} — ${st.label}`).join("\n");
    if (c.left && c.right) return `Left: ${c.left.bullets?.join(", ")}\nRight: ${c.right.bullets?.join(", ")}`;
    if (c.closing) return c.closing;
    return JSON.stringify(c, null, 2);
  };

  const setContentFromText = (s: SlideData, text: string): any => {
    const c = s.content || {};
    if (s.type === "bullet_list" || s.type === "conclusion") return { ...c, bullets: text.split("\n").filter(Boolean) };
    if (s.type === "quote") return { ...c, quote: text.replace(/^"|"$/g, "") };
    if (s.type === "title") return { ...c, subtitle: text };
    if (s.type === "stats" || s.type === "two_column") return c;
    return { ...c, text };
  };

  const startEditContent = () => {
    setEditText(getContentPreview(slide));
    setEditingContent(true);
  };

  const saveContent = () => {
    updateSlide(currentSlide, { content: setContentFromText(slide, editText) });
    setEditingContent(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden border-none rounded-none bg-[#1e1e1e]"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          transform: "none",
          left: 0,
          top: 0,
        }}
      >
        {/* Hidden accessible title */}
        <DialogTitle className="sr-only">Slide Preview</DialogTitle>
        <DialogDescription className="sr-only">{slides.length} slides · {theme.name}</DialogDescription>

        <div className="flex" style={{ height: "100vh" }}>
          {/* ── Thumbnail sidebar ── */}
          <div className="w-[180px] bg-[#252526] border-r border-[#333] flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-[#333]">
              <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Slides</p>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="flex flex-col gap-2">
                {slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentSlide(i); setEditingTitle(false); setEditingContent(false); }}
                    className={cn(
                      "relative rounded-md overflow-hidden transition-all aspect-video w-full group border-2",
                      i === currentSlide
                        ? "border-blue-500 shadow-lg shadow-blue-500/20"
                        : "border-transparent hover:border-[#555]"
                    )}
                  >
                    <SlideCanvas slide={s} theme={theme} isThumbnail />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top toolbar */}
            <div className="h-12 bg-[#2d2d2d] border-b border-[#333] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(currentSlide, { title: e.target.value })}
                      className="text-sm h-7 bg-[#3c3c3c] border-[#555] text-white"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-[#3c3c3c]">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-white truncate">{slide.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(true)} className="h-6 w-6 p-0 text-[#888] hover:text-white hover:bg-[#3c3c3c] shrink-0">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!editingContent && slide.type !== "stats" && slide.type !== "two_column" && (
                  <Button variant="ghost" size="sm" onClick={startEditContent} className="h-7 text-xs text-[#ccc] hover:text-white hover:bg-[#3c3c3c] gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-[#3c3c3c]" onClick={() => deleteSlide(currentSlide)} disabled={slides.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex items-center justify-center relative bg-[#1e1e1e] p-8 overflow-hidden">
              {/* Nav arrows */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-sm z-10"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-sm z-10"
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {/* Slide card */}
              <div className="w-full max-w-[780px] aspect-video rounded-lg overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <SlideCanvas slide={slide} theme={theme} />
              </div>

              {/* Slide counter pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white/80 text-xs font-medium px-3 py-1 rounded-full tabular-nums">
                {currentSlide + 1} / {slides.length}
              </div>
            </div>

            {/* Edit content panel */}
            {editingContent && (
              <div className="border-t border-[#333] bg-[#252526] p-4 shrink-0">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} className="text-xs resize-none bg-[#1e1e1e] border-[#444] text-white mb-2" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveContent} className="h-7 text-xs gap-1">
                    <Check className="h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingContent(false)} className="h-7 text-xs text-[#999] hover:text-white hover:bg-[#3c3c3c] gap-1">
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom bar */}
            <div className="h-12 bg-[#2d2d2d] border-t border-[#333] flex items-center justify-between px-4 shrink-0">
              <p className="text-[11px] text-[#888]">
                ← → navigate · Click thumbnail to jump · {theme.name} theme
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs bg-transparent border-[#555] text-[#ccc] hover:bg-[#3c3c3c] hover:text-white">
                  Cancel
                </Button>
                <Button size="sm" onClick={() => onExport(slides)} disabled={exporting} className="h-8 text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "Exporting…" : "Download PPTX"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
