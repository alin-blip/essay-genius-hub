import { useEffect, useState, useCallback } from "react";
import { Tables } from "@/integrations/supabase/types";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
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
import AiDetectionScore from "@/components/editor/AiDetectionScore";
import ReferenceValidator from "@/components/editor/ReferenceValidator";
import GenerationReport from "@/components/editor/GenerationReport";

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
  const [humanizeProgress, setHumanizeProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHumanized, setShowHumanized] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate("/dashboard");
          return;
        }
        setAssignment(data);
        if (data.humanized_content) setShowHumanized(true);
        setLoading(false);
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

      // Replace selected text with regenerated text
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
    if (!assignment?.generated_content || !id) return;
    setHumanizing(true);
    setHumanizeProgress(0);
    const interval = setInterval(() => {
      setHumanizeProgress((p) => Math.min(p + Math.random() * 10 + 3, 90));
    }, 1500);
    try {
      const { data, error } = await supabase.functions.invoke("humanize-text", {
        body: { assignment_id: id, content: assignment.generated_content },
      });
      clearInterval(interval);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHumanizeProgress(100);
      setTimeout(() => {
        setAssignment((prev) => (prev ? { ...prev, humanized_content: data.humanized_content } : prev));
        setShowHumanized(true);
        setEditedContent(null);
        setHasChanges(false);
        setHumanizing(false);
        toast({
          title: "Text Humanized! ✨",
          description: `${data.credits_used} credits used. ${data.credits_remaining} remaining.`,
        });
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setHumanizing(false);
      toast({ title: "Humanization Failed", description: err.message, variant: "destructive" });
    }
  };

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
    <div className="min-h-screen bg-secondary/20">
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-accent" />
            <span className="text-lg font-bold text-primary">AssignmentPro</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
          </Button>
        </div>
      </nav>

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
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <LetterText className="h-3 w-3" />
              {wordCount.toLocaleString()} words
            </Badge>
            <Badge variant={showHumanized && assignment.humanized_content ? "default" : "secondary"}>
              {showHumanized && assignment.humanized_content ? "Humanized" : "Original"}
            </Badge>
          </div>
        </div>

        {/* Tools Bar */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            {assignment.humanized_content ? (
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
            ) : (
              <Button
                size="sm"
                onClick={handleHumanize}
                disabled={humanizing}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                {humanizing ? "Humanizing..." : "Humanize Text"}
              </Button>
            )}

            <AiDetectionScore content={activeContent || ""} assignmentId={id!} />

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

        {/* Humanization Progress */}
        {humanizing && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-accent animate-pulse" />
                <span className="text-sm font-medium text-foreground">Humanizing your assignment...</span>
              </div>
              <Progress value={humanizeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Rewriting for natural sentence variation, vocabulary changes, and anti-detection patterns
              </p>
            </CardContent>
          </Card>
        )}

        {/* Editor */}
        <Card>
          <CardContent className="p-0">
            <TipTapEditor
              content={activeContent || ""}
              onUpdate={handleContentUpdate}
              onRegenerateSelection={handleRegenerateSelection}
              regenerating={regenerating}
            />
          </CardContent>
        </Card>

        {/* Generation Report */}
        <GenerationReport metadata={(assignment as any).generation_metadata} />

        {/* Reference Validator */}
        <ReferenceValidator references={assignment.references_list} assignmentId={id!} />
      </div>
    </div>
  );
};

export default AssignmentEditor;
