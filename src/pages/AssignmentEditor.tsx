import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState, useCallback, useRef } from "react";
import { Tables } from "@/integrations/supabase/types";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Presentation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  Users,
  ArrowLeft,
  FileText,
  Wand2,
  Copy,
  Check,
  Download,
  FileDown,
  LetterText,
  FileType,
  Save,
  Zap,
  Square,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { exportToDocx } from "@/lib/export-docx";
import { exportToPdf } from "@/lib/export-pdf";
import TipTapEditor from "@/components/editor/TipTapEditor";
import AiDetectionScore, { type DetectionResult, type SentenceAnalysis } from "@/components/editor/AiDetectionScore";
import ReferenceValidator from "@/components/editor/ReferenceValidator";
import GenerationReport from "@/components/editor/GenerationReport";
import SimilarityScore from "@/components/editor/SimilarityScore";
import DeepHumanizeProgress, { type PassResult } from "@/components/editor/DeepHumanizeProgress";

const GRADE_LABELS: Record<string, string> = {
  pass: "Pass",
  merit: "Merit / 2:2",
  distinction_lower: "Upper Second / 2:1",
  distinction: "Distinction / First",
};

const AssignmentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Tables<"assignments"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [humanizing, setHumanizing] = useState(false);
  const [humanizePass, setHumanizePass] = useState(0);
  const [humanizePasses, setHumanizePasses] = useState<PassResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [showHumanized, setShowHumanized] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [detectionSentences, setDetectionSentences] = useState<SentenceAnalysis[]>([]);
  const [showAiHighlights, setShowAiHighlights] = useState(false);
  const [showHumanizeConfirm, setShowHumanizeConfirm] = useState(false);
  const MAX_PASSES = 3;
  const TARGET_SCORE = 15;
  const stopHumanizeRef = useRef(false);

  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/dashboard");
          return;
        }
        setAssignment(data);
        if (data.humanized_content) setShowHumanized(true);
        setLoading(false);

        if (data.user_id === user.id) {
          supabase
            .from("managed_students")
            .select("admin_id")
            .eq("student_id", user.id)
            .eq("status", "accepted")
            .limit(1)
            .then(({ data: managers }) => {
              if (managers && managers.length > 0) {
                supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", managers[0].admin_id)
                  .single()
                  .then(({ data: profile }) => {
                    if (profile?.full_name) {
                      setAdminName(profile.full_name);
                    }
                  });
              }
            });
        }
      });
  }, [user, id, navigate]);

  const activeContent =
    editedContent ??
    (showHumanized && assignment?.humanized_content
      ? assignment.humanized_content
      : assignment?.generated_content);

  const wordCount = activeContent
    ? activeContent.replace(/[#*_\-\n]/g, " ").split(/\s+/).filter(Boolean).length
    : 0;

  const handleContentUpdate = useCallback(
    (newContent: string) => {
      setEditedContent(newContent);
      setHasChanges(true);
    },
    []
  );

  const handleSave = async () => {
    if (!editedContent || !id) return;
    setSaving(true);
    const field = showHumanized && assignment?.humanized_content ? "humanized_content" : "generated_content";
    const updateData: Record<string, string> = {};
    updateData[field] = editedContent;
    const { error } = await supabase
      .from("assignments")
      .update(updateData as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } else {
      setAssignment((prev) => (prev ? { ...prev, [field]: editedContent } : prev));
      setHasChanges(false);
      toast({ title: "Saved!" });
    }
    setSaving(false);
  };

  const handleRegenerateSelection = async (selectedText: string) => {
    if (!id) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-section", {
        body: { assignment_id: id, selected_text: selectedText, full_content: activeContent },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (activeContent && data.regenerated_text) {
        const newContent = activeContent.replace(selectedText, data.regenerated_text);
        setEditedContent(newContent);
        setHasChanges(true);
        toast({ title: "Section regenerated! ✨" });
      }
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHumanize = async () => {
    if (!id || !activeContent) return;
    setHumanizing(true);
    setHumanizePass(1);
    setHumanizePasses([]);
    stopHumanizeRef.current = false;

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/targeted-humanize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ content: activeContent, assignment_id: id }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Humanization failed");

      setHumanizePasses(data.passes || []);
      setHumanizePass(data.passes?.length || MAX_PASSES);

      // Update generation_metadata with new AI scores
      const finalScore = data.final_score;
      if (finalScore != null && assignment?.generation_metadata) {
        const updatedMetadata = {
          ...(assignment.generation_metadata as any),
          ai_detection: {
            overall_score: finalScore,
            human_score: 100 - finalScore,
            details: `After humanization: ${100 - finalScore}% human score`,
          },
        };
        await supabase
          .from("assignments")
          .update({ generation_metadata: updatedMetadata } as any)
          .eq("id", id);
        setAssignment((prev) =>
          prev ? { ...prev, generation_metadata: updatedMetadata } : prev
        );
      }

      setAssignment((prev) =>
        prev ? { ...prev, humanized_content: data.humanized_content } : prev
      );
      setShowHumanized(true);
      setEditedContent(null);
      setHasChanges(false);

      toast({
        title: finalScore != null && finalScore <= 15
          ? "Humanization Complete! ✨"
          : `Humanization Done (Score: ${finalScore ?? "?"}%)`,
        description: `${data.credits_used} credits used. ${data.credits_remaining} remaining.`,
      });
    } catch (err: any) {
      toast({
        title: "Humanization Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setHumanizing(false);
    }
  };

  const handleStopHumanize = useCallback(() => {
    stopHumanizeRef.current = true;
  }, []);

  const handleExportTxt = () => {
    if (!activeContent || !assignment) return;
    const blob = new Blob([activeContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assignment.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded as TXT" });
  };

  const handleVersionSwitch = (humanized: boolean) => {
    setShowHumanized(humanized);
    setEditedContent(null);
    setHasChanges(false);
  };

  if (loading || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="bg-secondary/20 min-h-full">

      <div className="container py-8 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{assignment.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              {assignment.module_name && <span>{assignment.module_name}</span>}
              {assignment.module_name && <span>·</span>}
              <span>{assignment.assignment_type?.replace(/_/g, " ")}</span>
              <span>·</span>
              <span>{GRADE_LABELS[assignment.target_grade] || assignment.target_grade}</span>
            </div>
            {adminName && (
              <Badge variant="outline" className="mt-2 gap-1 text-xs border-accent text-accent">
                <Users className="h-3 w-3" />
                Managed by {adminName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <LetterText className="h-3 w-3" />
              {wordCount.toLocaleString()} words
            </Badge>
            <Badge variant={showHumanized && assignment.humanized_content ? "default" : "secondary"}>
              {showHumanized && assignment.humanized_content ? "Humanized" : "Original"}
            </Badge>
            {(() => {
              const meta = assignment.generation_metadata as any;
              const humanScore = meta?.ai_detection?.human_score;
              if (humanScore == null) return null;
              const color = humanScore >= 70 ? "bg-green-500/15 text-green-600 border-green-500/30" 
                : humanScore >= 40 ? "bg-amber-500/15 text-amber-600 border-amber-500/30" 
                : "bg-destructive/15 text-destructive border-destructive/30";
              return (
                <Badge variant="outline" className={`gap-1 ${color}`}>
                  <Zap className="h-3 w-3" />
                  {humanScore}% Human
                </Badge>
              );
            })()}
          </div>
        </div>

        {/* Tools Bar */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            {assignment.humanized_content && (
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={!showHumanized ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleVersionSwitch(false)}
                  className="text-xs h-7"
                >
                  Original
                </Button>
                <Button
                  variant={showHumanized ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleVersionSwitch(true)}
                  className="text-xs h-7"
                >
                  Humanized
                </Button>
              </div>
            )}

            <Button
              size="sm"
              onClick={() => setShowHumanizeConfirm(true)}
              disabled={humanizing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Wand2 className="h-4 w-4 mr-1" />
              {humanizing ? "Humanizing..." : "Humanize"}
            </Button>

            <AiDetectionScore
              content={activeContent || ""}
              assignmentId={id!}
              onDetectionResult={(result) => {
                setDetectionSentences(result.sentences || []);
                if (result.sentences && result.sentences.length > 0) {
                  setShowAiHighlights(true);
                }
              }}
            />
            <SimilarityScore content={activeContent || ""} assignmentId={id!} />

            <div className="flex-1" />

            {hasChanges && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportTxt}>
                  <FileText className="h-4 w-4 mr-2" /> Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeContent) return;
                    exportToDocx({
                      title: assignment.title,
                      moduleName: assignment.module_name,
                      content: activeContent,
                      references: assignment.references_list,
                    });
                    toast({ title: "Downloaded as DOCX" });
                  }}
                >
                  <FileType className="h-4 w-4 mr-2" /> Export as DOCX
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!activeContent) return;
                    exportToPdf({
                      title: assignment.title,
                      moduleName: assignment.module_name,
                      content: activeContent,
                      references: assignment.references_list,
                    });
                    toast({ title: "Downloaded as PDF" });
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        {/* Humanize Progress */}
        {(humanizing || humanizePasses.length > 0) && (
          <DeepHumanizeProgress
            currentPass={humanizePass}
            maxPasses={MAX_PASSES}
            passes={humanizePasses}
            isRunning={humanizing}
            onStop={handleStopHumanize}
          />
        )}

        {/* Editor */}
        <Card>
          <CardContent className="p-0">
            <TipTapEditor
              content={activeContent || ""}
              onUpdate={handleContentUpdate}
              onRegenerateSelection={handleRegenerateSelection}
              regenerating={regenerating}
              highlightedSentences={detectionSentences}
              showHighlights={showAiHighlights}
              onToggleHighlights={() => setShowAiHighlights(prev => !prev)}
            />
          </CardContent>
        </Card>

        {/* Generation Report */}
        <GenerationReport metadata={(assignment as any).generation_metadata} />

        {/* Reference Validator */}
        <ReferenceValidator references={assignment.references_list} assignmentId={id!} />
      </div>

      {/* Humanize Confirmation Dialog */}
      <Dialog open={showHumanizeConfirm} onOpenChange={setShowHumanizeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent" />
              Humanize Assignment
            </DialogTitle>
            <DialogDescription>
              This will run up to {MAX_PASSES} passes of targeted rewriting using AI detection feedback to minimize your AI score.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated cost</span>
              <span className="font-semibold text-foreground">
                {Math.max(1, Math.ceil((assignment?.word_count || 3000) / 100))} credits
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Content</span>
              <span className="text-foreground">
                {showHumanized && assignment?.humanized_content ? "Humanized version" : "Original"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target AI score</span>
              <span className="text-foreground">≤ {TARGET_SCORE}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sentences flagged as AI-written will be rewritten. The rest stays unchanged.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowHumanizeConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowHumanizeConfirm(false);
                handleHumanize();
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Wand2 className="h-4 w-4 mr-1" />
              Confirm & Humanize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default AssignmentEditor;
