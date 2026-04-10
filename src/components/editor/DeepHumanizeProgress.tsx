import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Square, CheckCircle2 } from "lucide-react";

export interface PassResult {
  pass: number;
  score_before: number;
  score_after: number;
  sentences_rewritten: number;
}

interface DeepHumanizeProgressProps {
  currentPass: number;
  maxPasses: number;
  passes: PassResult[];
  isRunning: boolean;
  onStop: () => void;
}

const DeepHumanizeProgress = ({
  currentPass,
  maxPasses,
  passes,
  isRunning,
  onStop,
}: DeepHumanizeProgressProps) => {
  const latestScore = passes.length > 0 ? passes[passes.length - 1].score_after : null;

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent animate-pulse" />
            <span className="text-sm font-semibold text-foreground">
              Deep Humanize — {isRunning ? `Pass ${currentPass} of ${maxPasses}` : "Complete"}
            </span>
          </div>
          {isRunning && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStop}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
        </div>

        <Progress value={(currentPass / maxPasses) * 100} className="h-2" />

        {passes.length > 0 && (
          <div className="space-y-1.5">
            {passes.map((p) => (
              <div
                key={p.pass}
                className="flex items-center justify-between text-xs bg-background/60 rounded px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-foreground font-medium">Pass {p.pass}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {p.sentences_rewritten} sentences rewritten
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      p.score_after <= 15
                        ? "border-green-500/30 text-green-600"
                        : p.score_after <= 40
                        ? "border-yellow-500/30 text-yellow-600"
                        : "border-red-500/30 text-red-600"
                    }`}
                  >
                    {p.score_before}% → {p.score_after}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {isRunning && (
          <p className="text-xs text-muted-foreground">
            AI bypass engine processing — this may take 1-2 minutes per pass...
          </p>
        )}

        {!isRunning && latestScore !== null && (
          <p className="text-xs font-medium text-foreground">
            {latestScore <= 15
              ? "✨ Target reached! Content should now pass AI detection."
              : `Final AI score: ${latestScore}%. Consider running again or manually editing flagged sentences.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DeepHumanizeProgress;
