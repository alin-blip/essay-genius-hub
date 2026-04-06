import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  CreditCard,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link as RouterLink } from "react-router-dom";

const ASSIGNMENT_TYPES = [
  { value: "essay", label: "Essay" },
  { value: "report", label: "Report" },
  { value: "case_study", label: "Case Study" },
  { value: "reflective_account", label: "Reflective Account" },
  { value: "research_project", label: "Research Project" },
  { value: "literature_review", label: "Literature Review" },
  { value: "dissertation", label: "Dissertation" },
  { value: "presentation", label: "Presentation" },
];

const GRADES = [
  { value: "pass", label: "Pass", range: "40-49%", description: "Basic understanding, meets minimum requirements" },
  { value: "merit", label: "Merit / 2:2", range: "50-59%", description: "Good understanding with some analysis" },
  { value: "distinction_lower", label: "Upper Second / 2:1", range: "60-69%", description: "Strong critical analysis and well-structured arguments" },
  { value: "distinction", label: "Distinction / First Class", range: "70%+", description: "Exceptional depth, originality, and critical evaluation" },
];

const PROGRESS_MESSAGES = [
  "Analysing assignment brief...",
  "Researching relevant academic sources...",
  "Structuring your assignment...",
  "Writing introduction and key arguments...",
  "Developing critical analysis...",
  "Adding Harvard references...",
  "Refining academic tone and style...",
  "Applying quality enhancement...",
  "Finalising your assignment...",
];

const NewAssignment = () => {
  const [step, setStep] = useState(1);
  const [moduleName, setModuleName] = useState("");
  const [title, setTitle] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [wordCount, setWordCount] = useState([3000]);
  const [brief, setBrief] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [includeCaseStudies, setIncludeCaseStudies] = useState(false);
  const [includeHarvardRefs, setIncludeHarvardRefs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState(PROGRESS_MESSAGES[0]);
  const [creditsAvailable, setCreditsAvailable] = useState(5000);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscription } = useAuth();
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  const monthlyLimit = subscription.planTier?.assignmentsPerMonth ?? null;
  const isAtLimit = monthlyLimit !== null && monthlyCount >= monthlyLimit;

  useEffect(() => {
    if (user) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setCreditsAvailable(data.credits_balance);
        });

      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth)
        .then(({ count }) => {
          setMonthlyCount(count ?? 0);
        });
    }
  }, [user]);

  useEffect(() => {
    if (generating) {
      let msgIndex = 0;
      let progress = 0;
      progressInterval.current = setInterval(() => {
        progress = Math.min(progress + Math.random() * 8 + 2, 90);
        msgIndex = Math.min(Math.floor(progress / 11), PROGRESS_MESSAGES.length - 1);
        setProgressValue(progress);
        setProgressMessage(PROGRESS_MESSAGES[msgIndex]);
      }, 2000);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgressValue(0);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [generating]);

  const creditCost = Math.ceil(wordCount[0] / 100);

  const canProceed = () => {
    if (step === 1) return !!moduleName && !!title;
    if (step === 2) return !!assignmentType && !!targetGrade;
    if (step === 3) return brief.length >= 20;
    return true;
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to generate assignments.", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (creditsAvailable < creditCost) {
      toast({ title: "Insufficient credits", description: "Please upgrade your plan or buy more credits.", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-assignment", {
        body: {
          title,
          module_name: moduleName,
          unit_number: unitNumber,
          assignment_type: assignmentType,
          target_grade: targetGrade,
          word_count: wordCount[0],
          assignment_brief: brief,
          additional_instructions: additionalInstructions,
          include_harvard_refs: includeHarvardRefs,
          include_case_studies: includeCaseStudies,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setProgressValue(100);
      setProgressMessage("Assignment complete!");

      // Send assignment-ready email (fire-and-forget)
      if (user.email) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "assignment-ready",
            recipientEmail: user.email,
            idempotencyKey: `assignment-ready-${data.assignment_id}`,
            templateData: {
              name: user.user_metadata?.full_name || "",
              assignmentTitle: title,
              wordCount: wordCount[0],
              targetGrade,
              assignmentId: data.assignment_id,
            },
          },
        }).catch((err) => console.error("Assignment ready email failed:", err));
      }

      // Send low-credits warning if below threshold
      if (data.credits_remaining < 500 && user.email) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "low-credits",
            recipientEmail: user.email,
            idempotencyKey: `low-credits-${user.id}-${data.credits_remaining}`,
            templateData: {
              name: user.user_metadata?.full_name || "",
              creditsRemaining: data.credits_remaining,
            },
          },
        }).catch((err) => console.error("Low credits email failed:", err));
      }

      setTimeout(() => {
        setGenerating(false);
        toast({
          title: "Assignment Generated! ✨",
          description: `${data.credits_used} credits used. ${data.credits_remaining} remaining.`,
        });
        navigate(`/assignment/${data.assignment_id}`);
      }, 1000);
    } catch (err: any) {
      setGenerating(false);
      console.error("Generation error:", err);
      toast({
        title: "Generation Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="h-10 w-10 text-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary">Generating Your Assignment</h2>
          <p className="text-muted-foreground">
            Crafting your {assignmentType.replace(/_/g, " ")} with{" "}
            {GRADES.find((g) => g.value === targetGrade)?.label} quality...
          </p>
          <div className="space-y-2">
            <Progress value={progressValue} className="h-2" />
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
          </div>
          <p className="text-xs text-muted-foreground">This may take 30-60 seconds for longer assignments</p>
        </div>
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
            <Link to="/dashboard">← Back to Dashboard</Link>
          </Button>
        </div>
      </nav>

      <div className="container py-8 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create New Assignment</h1>
          <p className="text-muted-foreground">Step {step} of 4</p>
        </div>

        <Progress value={(step / 4) * 100} className="h-2" />

        {isAtLimit && (
          <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Monthly limit reached</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You've used {monthlyCount} of {monthlyLimit} assignments this month on your{" "}
                <span className="font-medium">{subscription.planTier?.name}</span> plan.
                Upgrade to get more assignments.
              </p>
              <Button size="sm" className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link to="/plans">
                  <Crown className="h-4 w-4 mr-1" /> Upgrade Plan
                </Link>
              </Button>
            </div>
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Module & Title"}
              {step === 2 && "Academic Requirements"}
              {step === 3 && "Assignment Brief"}
              {step === 4 && "Review & Generate"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your module details and assignment title"}
              {step === 2 && "Set your target grade and requirements"}
              {step === 3 && "Paste your assignment brief and any extra instructions"}
              {step === 4 && "Review everything before generating"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Module Name</Label>
                  <Input placeholder="e.g. Unit 5 - Human Resource Management" value={moduleName} onChange={(e) => setModuleName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Assignment Title</Label>
                  <Input placeholder="e.g. Analyse the impact of HRM strategies on employee retention" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Unit Number (optional)</Label>
                  <Input placeholder="e.g. Unit 5" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Assignment Type</Label>
                  <Select value={assignmentType} onValueChange={setAssignmentType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Target Grade</Label>
                  <div className="space-y-2">
                    {GRADES.map((g) => (
                      <button key={g.value} onClick={() => setTargetGrade(g.value)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${targetGrade === g.value ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-foreground">{g.label}</span>
                            <span className="text-muted-foreground text-sm ml-2">({g.range})</span>
                          </div>
                          {targetGrade === g.value && <CheckCircle className="h-4 w-4 text-accent" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Word Count</Label>
                    <span className="text-sm font-medium text-accent">{wordCount[0].toLocaleString()} words</span>
                  </div>
                  <Slider value={wordCount} onValueChange={setWordCount} min={500} max={15000} step={500} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500</span><span>15,000</span>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Assignment Brief</Label>
                  <Textarea placeholder="Paste your full assignment brief here..." value={brief} onChange={(e) => setBrief(e.target.value)} className="min-h-[200px]" />
                  <p className="text-xs text-muted-foreground">{brief.length} characters · Minimum 20 required</p>
                </div>
                <div className="space-y-2">
                  <Label>Additional Instructions (optional)</Label>
                  <Textarea placeholder="Any specific theories, models, or case studies to include..." value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} className="min-h-[100px]" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="harvard" checked={includeHarvardRefs} onCheckedChange={(c) => setIncludeHarvardRefs(!!c)} />
                    <Label htmlFor="harvard" className="font-normal">Include Harvard references</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="caseStudies" checked={includeCaseStudies} onCheckedChange={(c) => setIncludeCaseStudies(!!c)} />
                    <Label htmlFor="caseStudies" className="font-normal">Include real-world case studies</Label>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Module", value: moduleName },
                    { label: "Title", value: title },
                    { label: "Type", value: ASSIGNMENT_TYPES.find((t) => t.value === assignmentType)?.label },
                    { label: "Target Grade", value: GRADES.find((g) => g.value === targetGrade)?.label },
                    { label: "Word Count", value: `${wordCount[0].toLocaleString()} words` },
                    { label: "Harvard Refs", value: includeHarvardRefs ? "Yes" : "No" },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-medium text-foreground text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
                {brief && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Brief Preview</p>
                    <p className="text-sm text-foreground line-clamp-3">{brief}</p>
                  </div>
                )}
                <div className="p-4 rounded-lg border-2 border-accent/30 bg-accent/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">Credit Cost</p>
                      <p className="text-sm text-muted-foreground">{creditCost} credits ({wordCount[0].toLocaleString()} words ÷ 100)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{creditsAvailable.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">credits available</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={creditsAvailable < creditCost}>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Assignment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewAssignment;
