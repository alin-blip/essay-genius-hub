import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AiDetectionScoreProps {
  content: string;
  assignmentId: string;
}

interface DetectionResult {
  overall_score: number;
  human_score: number;
  details: string;
}

const AiDetectionScore = ({ content, assignmentId }: AiDetectionScoreProps) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!content) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-ai-detection", {
        body: { content, assignment_id: assignmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      toast({
        title: "Detection Check Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const getScoreColor = (humanScore: number) => {
    if (humanScore >= 85) return "text-green-500";
    if (humanScore >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (humanScore: number) => {
    if (humanScore >= 85) return <ShieldCheck className="h-5 w-5 text-green-500" />;
    if (humanScore >= 60) return <Shield className="h-5 w-5 text-yellow-500" />;
    return <ShieldAlert className="h-5 w-5 text-red-500" />;
  };

  const getScoreLabel = (humanScore: number) => {
    if (humanScore >= 85) return "Safe to Submit";
    if (humanScore >= 60) return "Consider Humanizing";
    return "High AI Detection Risk";
  };

  if (!result) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={checking || !content}
        className="gap-1"
      >
        {checking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
        {checking ? "Checking..." : "AI Detection Score"}
      </Button>
    );
  }

  return (
    <Card className="border-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getScoreIcon(result.human_score)}
            <span className="font-semibold text-sm">{getScoreLabel(result.human_score)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCheck} disabled={checking} className="text-xs">
            {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-check"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Human Score</p>
            <div className="flex items-center gap-2">
              <Progress value={result.human_score} className="h-2 flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(result.human_score)}`}>
                {result.human_score}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">AI Detected</p>
            <div className="flex items-center gap-2">
              <Progress value={result.overall_score} className="h-2 flex-1" />
              <span className="text-sm font-bold text-muted-foreground">
                {result.overall_score}%
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{result.details}</p>
      </CardContent>
    </Card>
  );
};

export default AiDetectionScore;
