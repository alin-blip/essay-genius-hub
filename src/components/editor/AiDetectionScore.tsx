import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SentenceAnalysis {
  text: string;
  generated_prob: number;
  highlight: boolean;
}

export interface DetectionResult {
  overall_score: number;
  human_score: number;
  details: string;
  confidence?: string | null;
  class_probabilities?: Record<string, number> | null;
  sentences?: SentenceAnalysis[];
}

interface AiDetectionScoreProps {
  content: string;
  assignmentId: string;
  onDetectionResult?: (result: DetectionResult) => void;
}

const AiDetectionScore = ({ content, assignmentId, onDetectionResult }: AiDetectionScoreProps) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [sentencesOpen, setSentencesOpen] = useState(false);
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
      onDetectionResult?.(data);
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

  const getConfidenceBadge = (confidence: string | null | undefined) => {
    if (!confidence) return null;
    const colors: Record<string, string> = {
      high: "bg-green-500/15 text-green-600 border-green-500/30",
      medium: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
      low: "bg-red-500/15 text-red-600 border-red-500/30",
    };
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${colors[confidence] || ""}`}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
      </Badge>
    );
  };

  const getSentenceColor = (prob: number) => {
    if (prob > 0.7) return "bg-red-500/15 border-l-red-500";
    if (prob > 0.4) return "bg-yellow-500/10 border-l-yellow-500";
    return "bg-green-500/5 border-l-green-500";
  };

  if (!result && !checking) {
    return (
      <Button variant="outline" size="sm" onClick={handleCheck} disabled={!content} className="gap-1">
        <Shield className="h-4 w-4" />
        AI Detection Score
      </Button>
    );
  }

  if (!result && checking) {
    return (
      <Card className="border border-accent/30 bg-accent/5 animate-fade-in">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="relative flex items-center justify-center h-8 w-8">
            <Shield className="h-5 w-5 text-accent animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-foreground">Scanning with GPTZero...</p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-accent/60 animate-[pulse_1.5s_ease-in-out_infinite] w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedSentences = [...(result!.sentences || [])].sort((a, b) => b.generated_prob - a.generated_prob);

  return (
    <Card className="border-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getScoreIcon(result!.human_score)}
            <span className="font-semibold text-sm">{getScoreLabel(result!.human_score)}</span>
            {getConfidenceBadge(result!.confidence)}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
              Powered by GPTZero
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleCheck} disabled={checking} className="text-xs">
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-check"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Human Score</p>
            <div className="flex items-center gap-2">
              <Progress value={result!.human_score} className="h-2 flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(result!.human_score)}`}>
                {result!.human_score}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">AI Detected</p>
            <div className="flex items-center gap-2">
              <Progress value={result!.overall_score} className="h-2 flex-1" />
              <span className="text-sm font-bold text-muted-foreground">
                {result!.overall_score}%
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{result!.details}</p>

        {/* Sentence Analysis Panel */}
        {sortedSentences.length > 0 && (
          <Collapsible open={sentencesOpen} onOpenChange={setSentencesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-7 px-2">
                <span>Sentence Analysis ({sortedSentences.length} sentences)</span>
                {sentencesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {sortedSentences.map((s, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded border-l-2 ${getSentenceColor(s.generated_prob)}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-muted-foreground">
                      {Math.round(s.generated_prob * 100)}% AI
                    </span>
                  </div>
                  <p className="text-foreground/80 line-clamp-2">{s.text}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default AiDetectionScore;
