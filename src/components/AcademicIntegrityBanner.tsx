import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "academic-integrity-banner-dismissed";

const AcademicIntegrityBanner = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <p className="flex-1 text-foreground/90">
        <strong>Draft for study purposes.</strong> Verify all references and edit substantially before
        submission. Follow your university's policy on AI assistance — see our{" "}
        <Link to="/acceptable-use" className="underline" target="_blank">
          Acceptable Use Policy
        </Link>
        .
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default AcademicIntegrityBanner;
