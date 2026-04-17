import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AcademicIntegrityModalProps {
  open: boolean;
  onContinue: () => void;
}

const AcademicIntegrityModal = ({ open, onContinue }: AcademicIntegrityModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onContinue(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Before you use this draft</DialogTitle>
          <DialogDescription className="text-center pt-2 text-base">
            This is a <strong>study draft</strong> — not a finished submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">You must:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Review and substantially edit the content</li>
                <li>Verify every reference and statistic independently</li>
                <li>Follow your university's policy on AI assistance</li>
                <li>Disclose AI use where required</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Submitting AI-generated work as your own without disclosure may breach your institution's
            academic integrity policy. See our{" "}
            <Link to="/acceptable-use" className="underline text-primary" target="_blank">
              Acceptable Use Policy
            </Link>
            .
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onContinue} className="w-full">
            I understand — open my draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AcademicIntegrityModal;
