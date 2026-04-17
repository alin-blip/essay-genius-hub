import DashboardLayout from "@/components/DashboardLayout";
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
  Upload,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link as RouterLink } from "react-router-dom";
import AcademicIntegrityModal from "@/components/AcademicIntegrityModal";

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
  "Fetching real academic sources from research databases...",
  "Structuring your assignment...",
  "Writing introduction and key arguments...",
  "Developing critical analysis with real references...",
  "Adding Harvard citations from verified sources...",
  "Refining academic tone and style...",
  "Running AI detection scan (GPTZero)...",
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, subscription } = useAuth();
  const progressInterval = useRef<ReturnType<typeof setInterval>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const creditCost = wordCount[0];

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "image/png",
      "image/jpeg",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Please upload a PDF, DOCX, DOC, TXT, PNG, or JPG file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }

    setExtracting(true);
    setUploadedFile(file);

    try {
      // Upload to storage
      const sanitizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from("assignment-briefs")
        .upload(filePath, file);

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      // Call extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-brief", {
        body: { file_path: filePath },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.extracted_text) {
        setBrief(data.extracted_text);
        toast({ title: "Brief extracted! ✨", description: "Text has been extracted from your file. Review and edit if needed." });
      } else {
        throw new Error("No text could be extracted");
      }
    } catch (err: any) {
      console.error("File extraction error:", err);
      toast({ title: "Extraction failed", description: err.message || "Could not extract text. Please paste manually.", variant: "destructive" });
      setUploadedFile(null);
    } finally {
      setExtracting(false);
    }
  };

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

    // Re-fetch credits right before generating to avoid stale data
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    const currentCredits = freshProfile?.credits_balance ?? creditsAvailable;
    setCreditsAvailable(currentCredits);

    if (currentCredits < creditCost) {
      toast({
        title: "Insufficient credits",
        description: `You need ${creditCost.toLocaleString()} credits but only have ${currentCredits.toLocaleString()}. Please upgrade your plan.`,
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      // Scale timeout: 30s per 1000 words, minimum 5 minutes
      const timeoutMs = Math.max(300000, wordCount[0] * 30);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-assignment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
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
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || "Generation failed";
        if (errorMsg.toLowerCase().includes("insufficient credits")) {
          toast({
            title: "Insufficient credits",
            description: `You need ${creditCost.toLocaleString()} credits but only have ${currentCredits.toLocaleString()}. Please upgrade your plan.`,
            variant: "destructive",
          });
        } else {
          throw new Error(errorMsg);
        }
        return;
      }

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
        const report = data.generation_report;
        const extras = [];
        if (report?.references_count) extras.push(`${report.references_count} references`);
        if (report?.tables_count) extras.push(`${report.tables_count} tables`);
        if (report?.has_financial_data) extras.push("financial data included");
        const extraInfo = extras.length ? ` · ${extras.join(", ")}` : "";
        toast({
          title: "Assignment Generated! ✨",
          description: `${report?.actual_word_count?.toLocaleString() || data.credits_used.toLocaleString()} words generated. ${data.credits_remaining.toLocaleString()} words remaining.${extraInfo}`,
        });
        try {
          const count = parseInt(localStorage.getItem("ai-warning-shown-count") || "0", 10) + 1;
          localStorage.setItem("ai-warning-shown-count", String(count));
        } catch {}
        setPendingAssignmentId(data.assignment_id);
      }, 1000);
    } catch (err: any) {
      console.error("Generation error:", err);
      const msg = err.message || "";
      const isTimeout = err.name === "AbortError" || msg.includes("Failed to send") || msg.includes("Failed to fetch") || msg.includes("504") || msg.includes("TimeoutError") || msg.includes("network") || msg.includes("aborted");
      
      // On timeout, poll up to 5 times (every 10s) for the completed assignment
      if (isTimeout && user) {
        const MAX_POLLS = 5;
        const POLL_INTERVAL = 10000;
        setProgressMessage("Still working... checking for your assignment...");
        
        for (let poll = 0; poll < MAX_POLLS; poll++) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL));
          try {
            const { data: recentAssignment } = await supabase
              .from("assignments")
              .select("id")
              .eq("user_id", user.id)
              .eq("title", title)
              .eq("status", "completed")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (recentAssignment) {
              setGenerating(false);
              toast({
                title: "Assignment Generated! ✨",
                description: "The generation took longer than expected but completed successfully.",
              });
              navigate(`/assignment/${recentAssignment.id}`);
              return;
            }
          } catch (checkErr) {
            console.error(`Poll ${poll + 1} failed:`, checkErr);
          }
          setProgressMessage(`Still working... attempt ${poll + 2} of ${MAX_POLLS}...`);
        }
      }
      
      setGenerating(false);
      toast({
        title: isTimeout ? "Generation timed out" : "Generation Failed",
        description: isTimeout
          ? "The server took too long to respond. Your credits have not been charged. Please try again."
          : msg || "Something went wrong. Credits have been refunded. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (generating) {
    return (
      <>
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
        <AcademicIntegrityModal
          open={!!pendingAssignmentId}
          onContinue={() => {
            const id = pendingAssignmentId;
            setPendingAssignmentId(null);
            if (id) navigate(`/assignment/${id}`);
          }}
        />
      </>
    );
  }

  return (
    <DashboardLayout>
    <div className="bg-secondary/20 min-h-full">

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
                  <Slider value={wordCount} onValueChange={setWordCount} min={500} max={10000} step={500} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500</span><span>10,000</span>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-3">
                  <Label>Assignment Brief</Label>

                  {/* File Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                      uploadedFile ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/40 hover:bg-accent/5"
                    }`}
                    onClick={() => !extracting && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    {extracting ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-accent animate-spin" />
                        <p className="text-sm font-medium text-foreground">Extracting text from your file...</p>
                        <p className="text-xs text-muted-foreground">AI is reading and extracting all content</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-6 w-6 text-accent" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">Text extracted successfully · You can edit below</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setBrief("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Upload Assignment Brief</p>
                        <p className="text-xs text-muted-foreground">
                          Drag & drop or click · PDF, DOCX, DOC, TXT, PNG, JPG
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or paste manually</span>
                    </div>
                  </div>

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
                <div className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                  creditsAvailable < creditCost
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-accent/30 bg-accent/5"
                }`}>
                  <div className="flex items-center gap-3">
                    <CreditCard className={`h-5 w-5 ${creditsAvailable < creditCost ? "text-destructive" : "text-accent"}`} />
                    <div>
                      <p className="font-medium text-foreground">Credit Cost</p>
                      <p className="text-sm text-muted-foreground">{creditCost.toLocaleString()} words from your balance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${creditsAvailable < creditCost ? "text-destructive" : "text-foreground"}`}>{creditsAvailable.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">credits available</p>
                  </div>
                </div>
                {creditsAvailable < creditCost && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Insufficient credits</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        You need {creditCost.toLocaleString()} words but only have {creditsAvailable.toLocaleString()}. Upgrade your plan to continue.
                      </p>
                      <Button size="sm" className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                        <Link to="/plans">
                          <Crown className="h-3 w-3 mr-1" /> Upgrade Plan
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
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
                <Button onClick={handleGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={creditsAvailable < creditCost || isAtLimit}>
                  <Sparkles className="h-4 w-4 mr-2" /> {isAtLimit ? "Limit Reached" : "Generate Assignment"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default NewAssignment;
