import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Download, ChevronLeft, ChevronRight, Trash2, Plus,
  ImagePlus, Upload, Wand2, GripVertical, Copy,
  ArrowUp, ArrowDown, X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

const SLIDE_TYPES = [
  { value: "content", label: "Content" },
  { value: "bullet_list", label: "Bullet List" },
  { value: "quote", label: "Quote" },
  { value: "stats", label: "Statistics" },
  { value: "two_column", label: "Two Column" },
  { value: "image_content", label: "Image + Content" },
  { value: "conclusion", label: "Conclusion" },
];

function getDefaultContent(type: string): any {
  switch (type) {
    case "content": return { text: "Click here to add content..." };
    case "bullet_list": return { bullets: ["Point 1", "Point 2", "Point 3"] };
    case "quote": return { quote: "Enter your quote here...", attribution: "Author" };
    case "stats": return { stats: [{ value: "0", label: "Metric 1" }, { value: "0", label: "Metric 2" }, { value: "0", label: "Metric 3" }] };
    case "two_column": return { left: { title: "Left", bullets: ["Point 1"] }, right: { title: "Right", bullets: ["Point 1"] } };
    case "image_content": return { text: "Click here to add content..." };
    case "conclusion": return { bullets: ["Key takeaway 1", "Key takeaway 2"], closing: "Thank you" };
    default: return { text: "Click here to add content..." };
  }
}

/* ── Editable text component ── */
function EditableText({
  value,
  onChange,
  style,
  className,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  style?: React.CSSProperties;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  const save = useCallback(() => {
    setEditing(false);
    if (text !== value) onChange(text);
  }, [text, value, onChange]);

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={cn("outline-none ring-1 ring-blue-400/60 rounded px-1 cursor-text", className)}
        style={{ ...style, minWidth: 40, background: "rgba(255,255,255,0.08)" }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) { e.preventDefault(); save(); }
          if (e.key === "Escape") { setText(value); setEditing(false); }
        }}
        onInput={(e) => setText((e.target as HTMLDivElement).textContent || "")}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  return (
    <div
      className={cn("cursor-pointer hover:ring-1 hover:ring-blue-400/40 rounded px-1 transition-all", className)}
      style={style}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {text || <span className="opacity-40">{placeholder || "Click to edit"}</span>}
    </div>
  );
}

/* ── Image area with upload/AI generate ── */
function ImageArea({
  imageData,
  onImageChange,
  isThumbnail,
  theme,
}: {
  imageData?: string;
  onImageChange: (data: string | undefined) => void;
  isThumbnail?: boolean;
  theme: PptxTheme;
}) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (isThumbnail) {
    if (imageData) {
      return (
        <div className="shrink-0 rounded overflow-hidden" style={{ width: "30%", border: `1px solid #${theme.colors.muted}40` }}>
          <img src={imageData} alt="" className="w-full h-auto object-cover" />
        </div>
      );
    }
    return null;
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-slide-image", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      if (data?.image) {
        onImageChange(data.image);
        toast({ title: "Image generated! ✨" });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      toast({ title: "Image generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "shrink-0 rounded-lg overflow-hidden cursor-pointer group relative",
            !imageData && "border-2 border-dashed flex items-center justify-center"
          )}
          style={{
            width: "35%",
            minHeight: 120,
            borderColor: imageData ? `#${theme.colors.muted}40` : `#${theme.colors.muted}60`,
            backgroundColor: imageData ? "transparent" : `#${theme.colors.muted}10`,
          }}
        >
          {imageData ? (
            <>
              <img src={imageData} alt="" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImagePlus className="h-6 w-6 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-6">
              <ImagePlus className="h-8 w-8" style={{ color: `#${theme.colors.muted}` }} />
              <span className="text-xs" style={{ color: `#${theme.colors.muted}` }}>Add Image</span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-[#2d2d2d] border-[#444] text-white" side="left">
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#ccc]">Add / Replace Image</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Button size="sm" variant="outline" className="w-full text-xs bg-transparent border-[#555] text-[#ccc] hover:bg-[#3c3c3c] hover:text-white gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload Image
          </Button>
          <div className="space-y-1.5">
            <Input
              placeholder="Describe the image..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="text-xs h-8 bg-[#1e1e1e] border-[#444] text-white"
              onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
            />
            <Button size="sm" className="w-full text-xs gap-2 h-7" onClick={handleAiGenerate} disabled={generating || !aiPrompt.trim()}>
              <Wand2 className="h-3.5 w-3.5" /> {generating ? "Generating..." : "AI Generate"}
            </Button>
          </div>
          {imageData && (
            <Button size="sm" variant="ghost" className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-[#3c3c3c] gap-2" onClick={() => onImageChange(undefined)}>
              <Trash2 className="h-3.5 w-3.5" /> Remove Image
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Slide Canvas with inline editing ── */
function SlideCanvas({
  slide,
  theme,
  isThumbnail,
  className,
  onUpdate,
}: {
  slide: SlideData;
  theme: PptxTheme;
  className?: string;
  isThumbnail?: boolean;
  onUpdate?: (updates: Partial<SlideData>) => void;
}) {
  const isDark = slide.type === "title" || slide.type === "conclusion" || slide.type === "quote";
  const editable = !isThumbnail && !!onUpdate;

  const updateContent = (patch: any) => {
    if (!onUpdate) return;
    onUpdate({ content: { ...(slide.content || {}), ...patch } });
  };

  const updateBullet = (bullets: string[], index: number, val: string) => {
    const newBullets = [...bullets];
    newBullets[index] = val;
    return newBullets;
  };

  const updateImage = (data: string | undefined) => {
    onUpdate?.({ image_data: data });
  };

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
      style={{ backgroundColor: `#${isDark ? theme.colors.dark : theme.colors.light}` }}
    >
      {/* Header bar */}
      {!isDark && (
        <div
          className="flex items-center"
          style={{
            backgroundColor: `#${theme.colors.primary}`,
            height: isThumbnail ? 6 : 40,
            paddingLeft: isThumbnail ? 4 : 24,
          }}
        >
          {editable ? (
            <EditableText
              value={slide.title}
              onChange={(val) => onUpdate?.({ title: val })}
              className="font-semibold truncate"
              style={{ color: `#${theme.colors.white}`, fontSize: 15, lineHeight: 1.2 }}
            />
          ) : (
            <span className="font-semibold truncate" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 5 : 15, lineHeight: 1.2 }}>
              {slide.title}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: isThumbnail ? "4px 5px" : "24px 32px", paddingTop: isDark ? (isThumbnail ? 10 : 48) : (isThumbnail ? 3 : 16) }}>
        {/* Title slide */}
        {slide.type === "title" && (
          <div className="flex flex-col justify-center" style={{ gap: isThumbnail ? 2 : 12 }}>
            <div style={{ height: isThumbnail ? 2 : 5, width: isThumbnail ? 16 : 80, borderRadius: 4, backgroundColor: `#${theme.colors.accent}` }} />
            {editable ? (
              <>
                <EditableText value={slide.title} onChange={(val) => onUpdate?.({ title: val })} className="font-bold leading-tight" style={{ color: `#${theme.colors.white}`, fontSize: 28 }} />
                <EditableText value={slide.content?.subtitle || ""} onChange={(val) => updateContent({ subtitle: val })} style={{ color: `#${theme.colors.muted}`, fontSize: 14 }} placeholder="Add subtitle..." />
                <EditableText value={slide.content?.author || ""} onChange={(val) => updateContent({ author: val })} style={{ color: `#${theme.colors.accent}`, fontSize: 12, marginTop: 8 }} placeholder="Add author..." />
              </>
            ) : (
              <>
                <h2 className="font-bold leading-tight" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 8 : 28 }}>{slide.title}</h2>
                {slide.content?.subtitle && <p style={{ color: `#${theme.colors.muted}`, fontSize: isThumbnail ? 5 : 14 }}>{slide.content.subtitle}</p>}
                {slide.content?.author && <p style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 1 : 8 }}>{slide.content.author}</p>}
              </>
            )}
          </div>
        )}

        {/* Conclusion */}
        {slide.type === "conclusion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 2 : 10 }}>
            <div style={{ height: isThumbnail ? 2 : 5, width: isThumbnail ? 16 : 80, borderRadius: 4, backgroundColor: `#${theme.colors.accent}` }} />
            {editable ? (
              <EditableText value={slide.title} onChange={(val) => onUpdate?.({ title: val })} className="font-bold" style={{ color: `#${theme.colors.white}`, fontSize: 22 }} />
            ) : (
              <h2 className="font-bold" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 7 : 22 }}>{slide.title}</h2>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1 : 6, marginTop: isThumbnail ? 1 : 8 }}>
              {slide.content?.bullets?.map((b: string, i: number) => (
                <div key={i} className="flex items-start" style={{ color: `#${theme.colors.light}`, fontSize: isThumbnail ? 4 : 13, gap: isThumbnail ? 2 : 8 }}>
                  <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 2 : 6, height: isThumbnail ? 2 : 6, marginTop: isThumbnail ? 1 : 4 }} />
                  {editable ? (
                    <EditableText value={b} onChange={(val) => updateContent({ bullets: updateBullet(slide.content.bullets, i, val) })} style={{ color: `#${theme.colors.light}`, fontSize: 13 }} />
                  ) : b}
                </div>
              ))}
            </div>
            {editable ? (
              <EditableText value={slide.content?.closing || ""} onChange={(val) => updateContent({ closing: val })} className="italic" style={{ color: `#${theme.colors.accent}`, fontSize: 12, marginTop: 8 }} placeholder="Add closing..." />
            ) : (
              slide.content?.closing && <p className="italic" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 1 : 8 }}>{slide.content.closing}</p>
            )}
          </div>
        )}

        {/* Quote */}
        {slide.type === "quote" && (
          <div className="flex flex-col justify-center rounded-lg" style={{ backgroundColor: `#${theme.colors.primary}`, padding: isThumbnail ? 4 : 28, marginTop: isThumbnail ? 2 : 12 }}>
            <span className="font-serif leading-none" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 14 : 56 }}>"</span>
            {editable ? (
              <>
                <EditableText value={slide.content?.quote || ""} onChange={(val) => updateContent({ quote: val })} className="italic leading-relaxed" style={{ color: `#${theme.colors.white}`, fontSize: 16, marginTop: 4 }} multiline />
                <EditableText value={slide.content?.attribution || ""} onChange={(val) => updateContent({ attribution: val })} className="font-medium" style={{ color: `#${theme.colors.accent}`, fontSize: 12, marginTop: 16 }} placeholder="— Author" />
              </>
            ) : (
              <>
                <p className="italic leading-relaxed" style={{ color: `#${theme.colors.white}`, fontSize: isThumbnail ? 5 : 16, marginTop: isThumbnail ? 0 : 4 }}>{slide.content?.quote}</p>
                {slide.content?.attribution && <p className="font-medium" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 4 : 12, marginTop: isThumbnail ? 2 : 16 }}>— {slide.content.attribution}</p>}
              </>
            )}
          </div>
        )}

        {/* Content / image_content */}
        {(slide.type === "content" || slide.type === "image_content") && (
          <div className="flex" style={{ gap: isThumbnail ? 3 : 16 }}>
            {editable ? (
              <EditableText value={slide.content?.text || ""} onChange={(val) => updateContent({ text: val })} className="leading-relaxed flex-1" style={{ color: `#${theme.colors.dark}`, fontSize: 14 }} multiline />
            ) : (
              <p className="leading-relaxed flex-1" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 5 : 14 }}>{slide.content?.text}</p>
            )}
            {editable ? (
              <ImageArea imageData={slide.image_data} onImageChange={updateImage} theme={theme} />
            ) : (
              slide.image_data && (
                <div className="shrink-0 rounded-lg overflow-hidden shadow-md" style={{ width: isThumbnail ? "30%" : "35%", border: `1px solid #${theme.colors.muted}40` }}>
                  <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
                </div>
              )
            )}
          </div>
        )}

        {/* Bullet list */}
        {slide.type === "bullet_list" && (
          <div className="flex" style={{ gap: isThumbnail ? 3 : 16 }}>
            <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1.5 : 8 }}>
              {slide.content?.bullets?.map((b: string, i: number) => (
                <div key={i} className="flex items-start" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 5 : 14, gap: isThumbnail ? 2 : 8 }}>
                  <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 2 : 6, height: isThumbnail ? 2 : 6, marginTop: isThumbnail ? 1 : 5 }} />
                  {editable ? (
                    <EditableText value={b} onChange={(val) => updateContent({ bullets: updateBullet(slide.content.bullets, i, val) })} style={{ color: `#${theme.colors.dark}`, fontSize: 14 }} />
                  ) : b}
                </div>
              ))}
            </div>
            {editable ? (
              <ImageArea imageData={slide.image_data} onImageChange={updateImage} theme={theme} />
            ) : (
              slide.image_data && (
                <div className="shrink-0 rounded-lg overflow-hidden shadow-md" style={{ width: isThumbnail ? "30%" : "35%", border: `1px solid #${theme.colors.muted}40` }}>
                  <img src={slide.image_data} alt="" className="w-full h-auto object-cover" />
                </div>
              )
            )}
          </div>
        )}

        {/* Stats */}
        {slide.type === "stats" && (
          <div className="flex" style={{ gap: isThumbnail ? 2 : 12, marginTop: isThumbnail ? 2 : 12 }}>
            {slide.content?.stats?.slice(0, 4).map((st: any, i: number) => (
              <div key={i} className="flex-1 rounded-lg text-center shadow-sm" style={{ backgroundColor: `#${theme.colors.white}`, border: `1px solid #${theme.colors.muted}30`, padding: isThumbnail ? 2 : 16 }}>
                {editable ? (
                  <>
                    <EditableText value={st.value} onChange={(val) => {
                      const newStats = [...slide.content.stats];
                      newStats[i] = { ...newStats[i], value: val };
                      updateContent({ stats: newStats });
                    }} className="font-bold" style={{ color: `#${theme.colors.accent}`, fontSize: 24 }} />
                    <EditableText value={st.label} onChange={(val) => {
                      const newStats = [...slide.content.stats];
                      newStats[i] = { ...newStats[i], label: val };
                      updateContent({ stats: newStats });
                    }} className="leading-tight" style={{ color: `#${theme.colors.dark}`, fontSize: 11, marginTop: 4 }} />
                  </>
                ) : (
                  <>
                    <p className="font-bold" style={{ color: `#${theme.colors.accent}`, fontSize: isThumbnail ? 6 : 24 }}>{st.value}</p>
                    <p className="leading-tight" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 3 : 11, marginTop: isThumbnail ? 1 : 4 }}>{st.label}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Two column */}
        {slide.type === "two_column" && (
          <div className="grid grid-cols-2" style={{ gap: isThumbnail ? 2 : 12, marginTop: isThumbnail ? 1 : 8 }}>
            {(["left", "right"] as const).map((side) => (
              <div key={side} className="rounded-lg shadow-sm" style={{ backgroundColor: `#${theme.colors.white}`, border: `1px solid #${theme.colors.muted}30`, padding: isThumbnail ? 3 : 16 }}>
                {editable ? (
                  <EditableText value={slide.content?.[side]?.title || ""} onChange={(val) => updateContent({ [side]: { ...slide.content[side], title: val } })} className="font-semibold" style={{ color: `#${theme.colors.primary}`, fontSize: 13, marginBottom: 8 }} />
                ) : (
                  <p className="font-semibold" style={{ color: `#${theme.colors.primary}`, fontSize: isThumbnail ? 4 : 13, marginBottom: isThumbnail ? 1 : 8 }}>{slide.content?.[side]?.title}</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: isThumbnail ? 1 : 4 }}>
                  {slide.content?.[side]?.bullets?.map((b: string, i: number) => (
                    <div key={i} className="flex items-start" style={{ color: `#${theme.colors.dark}`, fontSize: isThumbnail ? 3 : 11, gap: isThumbnail ? 1 : 6 }}>
                      <span className="shrink-0 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}`, width: isThumbnail ? 1.5 : 5, height: isThumbnail ? 1.5 : 5, marginTop: isThumbnail ? 1 : 3 }} />
                      {editable ? (
                        <EditableText value={b} onChange={(val) => {
                          const newBullets = [...(slide.content[side]?.bullets || [])];
                          newBullets[i] = val;
                          updateContent({ [side]: { ...slide.content[side], bullets: newBullets } });
                        }} style={{ color: `#${theme.colors.dark}`, fontSize: 11 }} />
                      ) : b}
                    </div>
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

/* ── Main component ── */
export default function SlidePreview({ open, slides: initialSlides, theme, onClose, onExport, exporting }: SlidePreviewProps) {
  const [slides, setSlides] = useState<SlideData[]>(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSlides(initialSlides);
    setCurrentSlide(0);
  }, [initialSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowLeft") setCurrentSlide((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrentSlide((c) => Math.min(slides.length - 1, c + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, slides.length]);

  const slide = slides[currentSlide];
  if (!slide) return null;

  const updateSlide = (index: number, updates: Partial<SlideData>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (currentSlide >= newSlides.length) setCurrentSlide(newSlides.length - 1);
  };

  const duplicateSlide = (index: number) => {
    const copy = JSON.parse(JSON.stringify(slides[index]));
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, copy);
    setSlides(newSlides);
    setCurrentSlide(index + 1);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const newSlides = [...slides];
    const [moved] = newSlides.splice(from, 1);
    newSlides.splice(to, 0, moved);
    setSlides(newSlides);
    setCurrentSlide(to);
  };

  const addSlide = (type: string) => {
    const newSlide: SlideData = {
      type,
      title: "New Slide",
      content: getDefaultContent(type),
    };
    const newSlides = [...slides];
    newSlides.splice(currentSlide + 1, 0, newSlide);
    setSlides(newSlides);
    setCurrentSlide(currentSlide + 1);
    setShowAddMenu(false);
  };

  // Drag handlers
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (index: number) => {
    if (dragIndex != null && dragIndex !== index) moveSlide(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden border-none rounded-none bg-[#1e1e1e]"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", maxWidth: "100vw", transform: "none", left: 0, top: 0 }}
      >
        <DialogTitle className="sr-only">Slide Editor</DialogTitle>
        <DialogDescription className="sr-only">{slides.length} slides · {theme.name} theme</DialogDescription>

        <div className="flex" style={{ height: "100vh" }}>
          {/* ── Thumbnail sidebar ── */}
          <div className="w-[180px] bg-[#252526] border-r border-[#333] flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-[#333] flex items-center justify-between">
              <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Slides</p>
              <Popover open={showAddMenu} onOpenChange={setShowAddMenu}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#888] hover:text-white hover:bg-[#3c3c3c]">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1 bg-[#2d2d2d] border-[#444]" side="right" align="start">
                  {SLIDE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#3c3c3c] hover:text-white rounded-sm transition-colors"
                      onClick={() => addSlide(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="flex flex-col gap-2">
                {slides.map((s, i) => (
                  <ContextMenu key={i}>
                    <ContextMenuTrigger asChild>
                      <div
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={() => handleDrop(i)}
                        onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                        onClick={() => setCurrentSlide(i)}
                        className={cn(
                          "relative rounded-md overflow-hidden transition-all aspect-video w-full cursor-pointer border-2",
                          i === currentSlide ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-transparent hover:border-[#555]",
                          dragOverIndex === i && dragIndex !== i && "border-blue-400 border-dashed"
                        )}
                      >
                        <div className="absolute top-0.5 left-0.5 bg-black/50 text-white text-[8px] px-1 rounded z-10 tabular-nums">
                          {i + 1}
                        </div>
                        <SlideCanvas slide={s} theme={theme} isThumbnail />
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-[#2d2d2d] border-[#444] text-[#ccc]">
                      <ContextMenuItem onClick={() => duplicateSlide(i)} className="text-xs gap-2 hover:bg-[#3c3c3c] hover:text-white">
                        <Copy className="h-3 w-3" /> Duplicate
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => moveSlide(i, i - 1)} disabled={i === 0} className="text-xs gap-2 hover:bg-[#3c3c3c] hover:text-white">
                        <ArrowUp className="h-3 w-3" /> Move Up
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => moveSlide(i, i + 1)} disabled={i === slides.length - 1} className="text-xs gap-2 hover:bg-[#3c3c3c] hover:text-white">
                        <ArrowDown className="h-3 w-3" /> Move Down
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => deleteSlide(i)} disabled={slides.length <= 1} className="text-xs gap-2 text-red-400 hover:bg-[#3c3c3c] hover:text-red-300">
                        <Trash2 className="h-3 w-3" /> Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top toolbar */}
            <div className="h-12 bg-[#2d2d2d] border-b border-[#333] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[10px] uppercase font-medium text-[#666] bg-[#333] px-2 py-0.5 rounded">
                  {slide.type.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-medium text-white truncate">{slide.title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-[#ccc] hover:text-white hover:bg-[#3c3c3c] gap-1" onClick={() => duplicateSlide(currentSlide)}>
                  <Copy className="h-3 w-3" /> Duplicate
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-[#3c3c3c]" onClick={() => deleteSlide(currentSlide)} disabled={slides.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#888] hover:text-white hover:bg-[#3c3c3c]" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex items-center justify-center relative bg-[#1e1e1e] p-8 overflow-hidden">
              <Button
                variant="ghost" size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-sm z-10"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-sm z-10"
                onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <div className="w-full max-w-[900px] aspect-video rounded-lg overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <SlideCanvas
                  slide={slide}
                  theme={theme}
                  onUpdate={(updates) => updateSlide(currentSlide, updates)}
                />
              </div>

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white/80 text-xs font-medium px-3 py-1 rounded-full tabular-nums">
                {currentSlide + 1} / {slides.length}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="h-12 bg-[#2d2d2d] border-t border-[#333] flex items-center justify-between px-4 shrink-0">
              <p className="text-[11px] text-[#888]">
                Click any text to edit · Right-click thumbnails for options · Drag to reorder
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
