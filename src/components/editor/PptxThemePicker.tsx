import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PPTX_THEMES, type PptxTheme } from "@/lib/pptx-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Presentation } from "lucide-react";

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Choose Presentation Theme
          </DialogTitle>
          <DialogDescription>
            Select a color theme for your slides before generating.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {PPTX_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelected(theme.id)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all hover:shadow-md",
                selected === theme.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex gap-1.5 mb-2">
                {[theme.colors.primary, theme.colors.accent, theme.colors.dark, theme.colors.light].map((c, i) => (
                  <div
                    key={i}
                    className="h-5 w-5 rounded-full border border-border/50"
                    style={{ backgroundColor: `#${c}` }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground">{theme.description}</p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Presentation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
