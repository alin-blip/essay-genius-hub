import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Pencil, Check, X, Trash2, Presentation } from "lucide-react";
import { useState } from "react";
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

export default function SlidePreview({ open, slides: initialSlides, theme, onClose, onExport, exporting }: SlidePreviewProps) {
  const [slides, setSlides] = useState<SlideData[]>(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [editText, setEditText] = useState("");

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

  const isDarkSlide = slide.type === "title" || slide.type === "conclusion" || slide.type === "quote";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Presentation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Slide Preview</DialogTitle>
              <DialogDescription className="text-xs">
                {slides.length} slides · {theme.name}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail sidebar */}
          <ScrollArea className="w-[140px] border-r bg-muted/20 p-2 shrink-0">
            <div className="flex flex-col gap-2">
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); setEditingTitle(false); setEditingContent(false); }}
                  className={cn(
                    "relative rounded-lg overflow-hidden border-2 transition-all aspect-video w-full group",
                    i === currentSlide
                      ? "border-primary shadow-md ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  style={{
                    backgroundColor: `#${s.type === "title" || s.type === "conclusion" || s.type === "quote" ? theme.colors.dark : theme.colors.light}`
                  }}
                >
                  {/* Mini header bar */}
                  {s.type !== "title" && s.type !== "conclusion" && s.type !== "quote" && (
                    <div className="h-2" style={{ backgroundColor: `#${theme.colors.primary}` }} />
                  )}
                  <div className="px-1.5 py-1">
                    <p className="text-[7px] font-semibold leading-tight truncate" style={{
                      color: `#${s.type === "title" || s.type === "conclusion" ? theme.colors.white : theme.colors.dark}`
                    }}>
                      {s.title}
                    </p>
                  </div>
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-medium opacity-50" style={{
                    color: `#${s.type === "title" || s.type === "conclusion" || s.type === "quote" ? theme.colors.muted : theme.colors.dark}`
                  }}>
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Slide canvas */}
            <div className="flex-1 flex items-center justify-center p-6 bg-muted/10 relative">
              {/* Navigation arrows */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background z-10"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background z-10"
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              {/* Slide card */}
              <div
                className="rounded-xl overflow-hidden shadow-2xl border border-black/10 w-full max-w-[640px] aspect-video relative"
                style={{ backgroundColor: `#${isDarkSlide ? theme.colors.dark : theme.colors.light}` }}
              >
                {/* Header bar */}
                {!isDarkSlide && (
                  <div className="h-[10%] flex items-center px-[5%]" style={{ backgroundColor: `#${theme.colors.primary}` }}>
                    <span className="font-semibold text-sm truncate" style={{ color: `#${theme.colors.white}` }}>{slide.title}</span>
                  </div>
                )}

                <div className="p-[5%] flex flex-col gap-[2%] h-full" style={{ paddingTop: isDarkSlide ? "12%" : "3%" }}>
                  {slide.type === "title" && (
                    <div className="flex flex-col justify-center flex-1 gap-3">
                      <div className="h-1 w-20 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                      <h2 className="text-2xl font-bold leading-tight" style={{ color: `#${theme.colors.white}` }}>{slide.title}</h2>
                      {slide.content?.subtitle && (
                        <p className="text-sm" style={{ color: `#${theme.colors.muted}` }}>{slide.content.subtitle}</p>
                      )}
                      {slide.content?.author && (
                        <p className="text-xs mt-2" style={{ color: `#${theme.colors.accent}` }}>{slide.content.author}</p>
                      )}
                    </div>
                  )}

                  {slide.type === "conclusion" && (
                    <div className="flex flex-col gap-2">
                      <div className="h-1 w-20 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                      <h2 className="text-xl font-bold" style={{ color: `#${theme.colors.white}` }}>{slide.title}</h2>
                      <div className="mt-2 space-y-1.5">
                        {slide.content?.bullets?.map((b: string, i: number) => (
                          <p key={i} className="text-xs flex items-start gap-2" style={{ color: `#${theme.colors.light}` }}>
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                            {b}
                          </p>
                        ))}
                      </div>
                      {slide.content?.closing && (
                        <p className="text-xs italic mt-3" style={{ color: `#${theme.colors.accent}` }}>{slide.content.closing}</p>
                      )}
                    </div>
                  )}

                  {slide.type === "quote" && (
                    <div className="flex flex-col justify-center flex-1 rounded-lg p-6" style={{ backgroundColor: `#${theme.colors.primary}` }}>
                      <span className="text-5xl font-serif leading-none" style={{ color: `#${theme.colors.accent}` }}>"</span>
                      <p className="text-base italic leading-relaxed mt-1" style={{ color: `#${theme.colors.white}` }}>{slide.content?.quote}</p>
                      {slide.content?.attribution && (
                        <p className="text-xs mt-4 font-medium" style={{ color: `#${theme.colors.accent}` }}>— {slide.content.attribution}</p>
                      )}
                    </div>
                  )}

                  {(slide.type === "content" || slide.type === "image_content") && (
                    <div className={cn("flex gap-4", slide.image_data ? "items-start" : "")}>
                      <p className={cn("text-xs leading-relaxed", slide.image_data ? "flex-1" : "")} style={{ color: `#${theme.colors.dark}` }}>
                        {slide.content?.text}
                      </p>
                      {slide.image_data && (
                        <div className="w-1/3 shrink-0 rounded-lg overflow-hidden shadow-md border">
                          <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  {slide.type === "bullet_list" && (
                    <div className={cn("flex gap-4", slide.image_data ? "" : "")}>
                      <div className={cn("space-y-1.5", slide.image_data ? "flex-1" : "w-full")}>
                        {slide.content?.bullets?.map((b: string, i: number) => (
                          <p key={i} className="text-xs flex items-start gap-2" style={{ color: `#${theme.colors.dark}` }}>
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                            {b}
                          </p>
                        ))}
                      </div>
                      {slide.image_data && (
                        <div className="w-1/3 shrink-0 rounded-lg overflow-hidden shadow-md border">
                          <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  )}

                  {slide.type === "stats" && (
                    <div className="flex gap-3 mt-2">
                      {slide.content?.stats?.slice(0, 4).map((st: any, i: number) => (
                        <div
                          key={i}
                          className="flex-1 rounded-lg p-3 text-center shadow-sm"
                          style={{ backgroundColor: `#${theme.colors.white}`, border: `1px solid #${theme.colors.muted}30` }}
                        >
                          <p className="text-xl font-bold" style={{ color: `#${theme.colors.accent}` }}>{st.value}</p>
                          <p className="text-[10px] mt-1 leading-tight" style={{ color: `#${theme.colors.dark}` }}>{st.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {slide.type === "two_column" && (
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {(["left", "right"] as const).map((side) => (
                        <div
                          key={side}
                          className="rounded-lg p-3 shadow-sm"
                          style={{ backgroundColor: `#${theme.colors.white}`, border: `1px solid #${theme.colors.muted}30` }}
                        >
                          <p className="text-xs font-semibold mb-2" style={{ color: `#${theme.colors.primary}` }}>{slide.content?.[side]?.title}</p>
                          <div className="space-y-1">
                            {slide.content?.[side]?.bullets?.map((b: string, i: number) => (
                              <p key={i} className="text-[10px] flex items-start gap-1.5" style={{ color: `#${theme.colors.dark}` }}>
                                <span className="mt-0.5 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                                {b}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slide type badge */}
                <Badge
                  className="absolute top-2 right-2 text-[9px] px-1.5 py-0 font-mono border-none"
                  style={{
                    backgroundColor: `#${theme.colors.primary}20`,
                    color: `#${isDarkSlide ? theme.colors.accent : theme.colors.primary}`,
                  }}
                >
                  {slide.type}
                </Badge>
              </div>
            </div>

            {/* Bottom edit bar */}
            <div className="border-t bg-background p-4 space-y-3">
              <div className="flex items-center gap-2">
                {editingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(currentSlide, { title: e.target.value })}
                      className="text-sm h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate">{slide.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTitle(true)} className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {!editingContent && slide.type !== "stats" && slide.type !== "two_column" && (
                    <Button variant="outline" size="sm" onClick={startEditContent} className="h-8 text-xs">
                      <Pencil className="h-3 w-3 mr-1" /> Edit Content
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteSlide(currentSlide)} disabled={slides.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {editingContent && (
                <div className="space-y-2">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} className="text-xs resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveContent} className="h-7 text-xs">
                      <Check className="h-3 w-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingContent(false)} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Click any thumbnail to navigate · Edit titles and content before exporting
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onExport(slides)} disabled={exporting} className="gap-1.5">
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Download PPTX"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
