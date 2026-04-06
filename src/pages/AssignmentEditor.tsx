import { useEffect, useState } from "react";
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
  const [assignment, setAssignment] = useState<Tables<'assignments'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [humanizing, setHumanizing] = useState(false);
  const [humanizeProgress, setHumanizeProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHumanized, setShowHumanized] = useState(false);

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

  const activeContent = showHumanized && assignment?.humanized_content
    ? assignment.humanized_content
    : assignment?.generated_content;

  const wordCount = activeContent
    ? activeContent.replace(/[#*_\-\n]/g, " ").split(/\s+/).filter(Boolean).length
    : 0;

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
        setAssignment((prev: any) => ({ ...prev, humanized_content: data.humanized_content }));
        setShowHumanized(true);
        setHumanizing(false);
        toast({
          title: "Text Humanized! ✨",
          description: `${data.credits_used} credits used. ${data.credits_remaining} remaining.`,
        });
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setHumanizing(false);
      toast({
        title: "Humanization Failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
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

  const renderContent = (content: string) => {
    return content.split("\n").map((line: string, i: number) => {
      if (line.startsWith("## "))
        return <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">{line.replace("## ", "")}</h2>;
      if (line.startsWith("### "))
        return <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.replace("### ", "")}</h3>;
      if (line.startsWith("**") && line.endsWith("**"))
        return <p key={i} className="font-semibold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-foreground leading-relaxed mb-2">{line}</p>;
    });
  };

  if (loading) {
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
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
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
                  onClick={() => setShowHumanized(false)}
                  className="text-xs h-7"
                >
                  Original
                </Button>
                <Button
                  variant={showHumanized ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowHumanized(true)}
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

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportTxt}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (!activeContent || !assignment) return;
                  exportToDocx({
                    title: assignment.title,
                    moduleName: assignment.module_name,
                    content: activeContent,
                    references: assignment.references_list,
                  });
                  toast({ title: "Downloaded as DOCX" });
                }}>
                  <FileType className="h-4 w-4 mr-2" />
                  Export as DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (!activeContent || !assignment) return;
                  exportToPdf({
                    title: assignment.title,
                    moduleName: assignment.module_name,
                    content: activeContent,
                    references: assignment.references_list,
                  });
                  toast({ title: "Downloaded as PDF" });
                }}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as PDF
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

        {/* Content */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                {showHumanized && assignment.humanized_content ? "Humanized Content" : "Generated Content"}
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              {activeContent ? renderContent(activeContent) : (
                <p className="text-muted-foreground">No content available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssignmentEditor;
