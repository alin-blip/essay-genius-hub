import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LetterText, FileText } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

interface WordUsageCardProps {
  creditsBalance: number;
  totalWords: number | null; // null = unlimited
  assignments: Tables<"assignments">[];
}

const WordUsageCard = ({ creditsBalance, totalWords, assignments }: WordUsageCardProps) => {
  const isUnlimited = totalWords === null;
  const wordsUsed = isUnlimited ? 0 : Math.max(totalWords - creditsBalance, 0);
  const usagePercent = isUnlimited ? 0 : Math.min((wordsUsed / totalWords) * 100, 100);

  // Get this month's completed assignments with word counts
  const now = new Date();
  const thisMonthAssignments = assignments
    .filter((a) => {
      const d = new Date(a.created_at);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        a.status === "completed"
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const barColor =
    usagePercent >= 90
      ? "bg-destructive"
      : usagePercent >= 70
        ? "bg-amber-500"
        : "bg-accent";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <LetterText className="h-5 w-5 text-accent" />
        <CardTitle className="text-lg">Word Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main progress */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">
              {creditsBalance.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              {isUnlimited
                ? "unlimited remaining"
                : `/ ${totalWords.toLocaleString()} words remaining`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="space-y-1">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${barColor}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {wordsUsed.toLocaleString()} words used ({Math.round(usagePercent)}%)
              </p>
            </div>
          )}
          {isUnlimited && (
            <Badge variant="secondary" className="text-xs">♾️ Unlimited Plan</Badge>
          )}
        </div>

        {/* Breakdown by assignment */}
        {thisMonthAssignments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              This Month's Breakdown
            </p>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {thisMonthAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/40 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground">{a.title}</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-2">
                    {a.word_count.toLocaleString()} words
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WordUsageCard;
