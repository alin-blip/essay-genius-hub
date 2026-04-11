import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PPTX_THEMES, type PptxTheme } from "@/lib/pptx-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Presentation, Check } from "lucide-react";

interface PptxThemePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (theme: PptxTheme) => void;
  loading?: boolean;
}

export default function PptxThemePicker({ open, onClose, onSelect, loading }: PptxThemePickerProps) {
  const [selected, setSelected] = useState<string>(PPTX_THEMES[0].id);

  const handleGenerate = () => {
    const theme = PPTX_THEMES.find((t) => t.id === selected)!;
    onSelect(theme);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Presentation className="h-4 w-4 text-primary" />
              </div>
              Choose Presentation Theme
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Select a color scheme that matches your presentation style.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {PPTX_THEMES.map((theme) => {
              const isSelected = selected === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelected(theme.id)}
                  className={cn(
                    "relative rounded-xl border-2 p-0 text-left transition-all overflow-hidden group",
                    isSelected
                      ? "border-primary shadow-lg ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  {/* Mini slide preview */}
                  <div className="h-16 relative" style={{ backgroundColor: `#${theme.colors.dark}` }}>
                    {/* Mini header bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-3" style={{ backgroundColor: `#${theme.colors.primary}` }} />
                    {/* Accent line */}
                    <div className="absolute top-3 left-3 h-0.5 w-8 rounded-full" style={{ backgroundColor: `#${theme.colors.accent}` }} />
                    {/* Title placeholder */}
                    <div className="absolute top-5 left-3 h-1.5 w-16 rounded-sm opacity-80" style={{ backgroundColor: `#${theme.colors.white}` }} />
                    <div className="absolute top-8 left-3 h-1 w-10 rounded-sm opacity-40" style={{ backgroundColor: `#${theme.colors.muted}` }} />

                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      {[theme.colors.primary, theme.colors.accent, theme.colors.dark, theme.colors.light].map((c, i) => (
                        <div
                          key={i}
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: `#${c}` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-semibold">{theme.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{theme.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
            <Presentation className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Presentation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
