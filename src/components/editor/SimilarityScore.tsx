import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SimilarityScoreProps {
  content: string;
  assignmentId: string;
}

interface Comparison {
  assignment_id: string;
  title: string;
  similarity: number;
}

interface SimilarityResult {
  overall_similarity: number;
  verdict: string;
  details: string;
  comparisons: Comparison[];
}

const SimilarityScore = ({ content, assignmentId }: SimilarityScoreProps) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!content) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-similarity", {
        body: { content, assignment_id: assignmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      toast({
        title: "Similarity Check Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case "unique":
        return { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, label: "Unique", color: "text-green-500", badgeClass: "bg-green-100 text-green-800" };
      case "low_similarity":
        return { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, label: "Low Similarity", color: "text-green-500", badgeClass: "bg-green-100 text-green-800" };
      case "moderate_similarity":
        return { icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, label: "Moderate Similarity", color: "text-amber-500", badgeClass: "bg-amber-100 text-amber-800" };
      case "high_similarity":
        return { icon: <XCircle className="h-5 w-5 text-red-500" />, label: "High Similarity", color: "text-red-500", badgeClass: "bg-red-100 text-red-800" };
      default:
        return { icon: <Fingerprint className="h-5 w-5" />, label: "Unknown", color: "", badgeClass: "" };
    }
  };

  if (!result && !checking) {
    return (
      <Button variant="outline" size="sm" onClick={handleCheck} disabled={!content} className="gap-1">
        <Fingerprint className="h-4 w-4" />
        Similarity Check
      </Button>
    );
  }

  if (!result && checking) {
    return (
      <Card className="border border-accent/30 bg-accent/5 animate-fade-in">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="relative flex items-center justify-center h-8 w-8">
            <Fingerprint className="h-5 w-5 text-accent animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-foreground">Comparing against previous assignments...</p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-accent/60 animate-[pulse_1.5s_ease-in-out_infinite] w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const config = getVerdictConfig(result.verdict);

  return (
    <Card className="border-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className="font-semibold text-sm">{config.label}</span>
            <Badge className={config.badgeClass}>{result.overall_similarity}%</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCheck} disabled={checking} className="text-xs">
            {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-check"}
          </Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Highest Similarity</p>
          <div className="flex items-center gap-2">
            <Progress value={result.overall_similarity} className="h-2 flex-1" />
            <span className={`text-sm font-bold ${config.color}`}>{result.overall_similarity}%</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{result.details}</p>

        {result.comparisons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Matches</p>
            {result.comparisons.map((c) => (
              <div key={c.assignment_id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/40 text-sm">
                <span className="truncate text-foreground">{c.title}</span>
                <span className={`text-xs font-medium whitespace-nowrap ml-2 ${c.similarity > 25 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {c.similarity}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimilarityScore;
