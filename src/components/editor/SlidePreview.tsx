import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Pencil, Check, X, Trash2 } from "lucide-react";
import { useState } from "react";
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
    if (s.type === "bullet_list" || s.type === "conclusion") {
      return { ...c, bullets: text.split("\n").filter(Boolean) };
    }
    if (s.type === "quote") {
      return { ...c, quote: text.replace(/^"|"$/g, "") };
    }
    if (s.type === "title") {
      return { ...c, subtitle: text };
    }
    if (s.type === "stats") return c; // stats are complex, skip text edit
    if (s.type === "two_column") return c; // complex, skip
    return { ...c, text };
  };

  const [editText, setEditText] = useState("");

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
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Slide Preview</DialogTitle>
          <DialogDescription>
            Review and edit your slides before downloading. {slides.length} slides total.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Slide preview card */}
          <div
            className="rounded-lg border overflow-hidden aspect-video relative"
            style={{ backgroundColor: `#${slide.type === "title" || slide.type === "conclusion" ? theme.colors.dark : theme.colors.light}` }}
          >
            {/* Header bar for non-title slides */}
            {slide.type !== "title" && slide.type !== "conclusion" && slide.type !== "quote" && (
              <div className="h-12 flex items-center px-4" style={{ backgroundColor: `#${theme.colors.primary}` }}>
                <span className="text-white font-semibold text-sm truncate">{slide.title}</span>
              </div>
            )}

            <div className="p-6 flex flex-col gap-2">
              {slide.type === "title" && (
                <>
                  <div className="h-1 w-16 rounded" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                  <h2 className="text-xl font-bold" style={{ color: `#${theme.colors.white}` }}>{slide.title}</h2>
                  {slide.content?.subtitle && (
                    <p className="text-sm" style={{ color: `#${theme.colors.muted}` }}>{slide.content.subtitle}</p>
                  )}
                </>
              )}

              {slide.type === "conclusion" && (
                <>
                  <div className="h-1 w-16 rounded" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                  <h2 className="text-lg font-bold" style={{ color: `#${theme.colors.white}` }}>{slide.title}</h2>
                  {slide.content?.bullets?.map((b: string, i: number) => (
                    <p key={i} className="text-xs" style={{ color: `#${theme.colors.light}` }}>• {b}</p>
                  ))}
                </>
              )}

              {slide.type === "quote" && (
                <div className="flex flex-col justify-center h-full" style={{ backgroundColor: `#${theme.colors.primary}`, margin: "-1.5rem", padding: "1.5rem", borderRadius: "0.5rem" }}>
                  <span className="text-4xl font-bold" style={{ color: `#${theme.colors.accent}` }}>"</span>
                  <p className="text-sm italic" style={{ color: `#${theme.colors.white}` }}>{slide.content?.quote}</p>
                  {slide.content?.attribution && (
                    <p className="text-xs mt-2" style={{ color: `#${theme.colors.accent}` }}>— {slide.content.attribution}</p>
                  )}
                </div>
              )}

              {(slide.type === "content" || slide.type === "image_content") && (
                <p className="text-xs leading-relaxed" style={{ color: `#${theme.colors.dark}` }}>{slide.content?.text}</p>
              )}

              {slide.type === "bullet_list" && (
                <div>
                  {slide.content?.bullets?.map((b: string, i: number) => (
                    <p key={i} className="text-xs" style={{ color: `#${theme.colors.dark}` }}>
                      <span style={{ color: `#${theme.colors.accent}` }}>•</span> {b}
                    </p>
                  ))}
                </div>
              )}

              {slide.type === "stats" && (
                <div className="flex gap-3">
                  {slide.content?.stats?.slice(0, 4).map((st: any, i: number) => (
                    <div key={i} className="flex-1 rounded border p-2 text-center" style={{ backgroundColor: `#${theme.colors.white}` }}>
                      <p className="text-lg font-bold" style={{ color: `#${theme.colors.accent}` }}>{st.value}</p>
                      <p className="text-[10px]" style={{ color: `#${theme.colors.dark}` }}>{st.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {slide.type === "two_column" && (
                <div className="grid grid-cols-2 gap-3">
                  {["left", "right"].map((side) => (
                    <div key={side} className="rounded border p-2" style={{ backgroundColor: `#${theme.colors.white}` }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: `#${theme.colors.primary}` }}>{slide.content?.[side]?.title}</p>
                      {slide.content?.[side]?.bullets?.map((b: string, i: number) => (
                        <p key={i} className="text-[10px]" style={{ color: `#${theme.colors.dark}` }}>• {b}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {slide.image_data && (
                <div className="absolute bottom-4 right-4 w-24 h-16 rounded overflow-hidden border">
                  <img src={slide.image_data} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">{slide.type}</Badge>
          </div>

          {/* Edit area */}
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={slide.title}
                  onChange={(e) => updateSlide(currentSlide, { title: e.target.value })}
                  className="text-sm"
                />
                <Button size="icon" variant="ghost" onClick={() => setEditingTitle(false)}><Check className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium truncate">{slide.title}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditingTitle(true)}><Pencil className="h-3 w-3" /></Button>
              </div>
            )}
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSlide(currentSlide)} disabled={slides.length <= 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {editingContent ? (
            <div className="space-y-2">
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={5} className="text-xs" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveContent}><Check className="h-3 w-3 mr-1" /> Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingContent(false)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditContent} disabled={slide.type === "stats" || slide.type === "two_column"}>
              <Pencil className="h-3 w-3 mr-1" /> Edit Content
            </Button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${i === currentSlide ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onExport(slides)} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? "Exporting..." : "Download PPTX"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
