import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reference {
  original: string;
  status: "verified" | "not_found" | "partial_match";
  details?: string;
  suggestion?: string;
}

interface ReferenceValidatorProps {
  references: string | null;
  assignmentId: string;
}

const ReferenceValidator = ({ references, assignmentId }: ReferenceValidatorProps) => {
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<Reference[] | null>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!references) return;
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-references", {
        body: { references, assignment_id: assignmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResults(data.results);
    } catch (err: any) {
      toast({
        title: "Validation Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
      case "not_found": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge variant="default" className="bg-green-500/10 text-green-600 text-xs">Verified</Badge>;
      case "not_found": return <Badge variant="destructive" className="text-xs">Not Found</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Partial Match</Badge>;
    }
  };

  if (!references) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1">
        <BookOpen className="h-4 w-4" />
        No References
      </Button>
    );
  }

  if (!results) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleValidate}
        disabled={validating}
        className="gap-1"
      >
        {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
        {validating ? "Validating..." : "Validate References"}
      </Button>
    );
  }

  const verified = results.filter((r) => r.status === "verified").length;
  const total = results.length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-semibold text-sm">
              References: {verified}/{total} verified
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleValidate} disabled={validating} className="text-xs">
            {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-validate"}
          </Button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((ref, i) => (
            <div key={i} className="flex items-start gap-2 text-xs border rounded p-2">
              {getStatusIcon(ref.status)}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{ref.original}</p>
                {ref.details && <p className="text-muted-foreground mt-0.5">{ref.details}</p>}
                {ref.suggestion && (
                  <p className="text-accent mt-0.5 italic">Suggestion: {ref.suggestion}</p>
                )}
              </div>
              {getStatusBadge(ref.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferenceValidator;
