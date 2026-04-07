import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, BookOpen, Table2, FileCheck, Shield } from "lucide-react";
import { useState } from "react";

interface GenerationMetadata {
  actual_word_count?: number;
  requested_word_count?: number;
  references_count?: number;
  tables_count?: number;
  figures_mentioned?: number;
  has_financial_data?: boolean;
  includes_case_studies?: boolean;
  uniqueness_seed?: string;
  generated_at?: string;
}

interface GenerationReportProps {
  metadata: GenerationMetadata | null;
}

const GenerationReport = ({ metadata }: GenerationReportProps) => {
  const [open, setOpen] = useState(false);

  if (!metadata) return null;

  const wordAccuracy = metadata.requested_word_count
    ? Math.round(((metadata.actual_word_count || 0) / metadata.requested_word_count) * 100)
    : 0;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Generation Details</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Words Generated</span>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {(metadata.actual_word_count || 0).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    / {(metadata.requested_word_count || 0).toLocaleString()} ({wordAccuracy}%)
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">References</span>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {metadata.references_count || 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tables / Figures</span>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {metadata.tables_count || 0} / {metadata.figures_mentioned || 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {metadata.has_financial_data && (
                <Badge variant="secondary" className="text-xs">📊 Financial Data</Badge>
              )}
              {metadata.includes_case_studies && (
                <Badge variant="secondary" className="text-xs">📋 Case Studies</Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1">
                <Shield className="h-3 w-3" /> Unique
              </Badge>
            </div>

            {metadata.generated_at && (
              <p className="text-xs text-muted-foreground">
                Generated {new Date(metadata.generated_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GenerationReport;
