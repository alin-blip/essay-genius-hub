import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const LEVELS = [
  { value: "hnd_level5", label: "HND Level 5" },
  { value: "bsc_level6", label: "BSc / BA Level 6 (Undergraduate)" },
  { value: "msc_level7", label: "MSc / MA Level 7 (Postgraduate)" },
];

const COURSES = [
  "Construction Management",
  "Business Management",
  "Health & Social Care",
  "Computing & IT",
  "Engineering",
  "Law",
  "Education",
  "Nursing",
  "Psychology",
  "Accounting & Finance",
  "Marketing",
  "Human Resource Management",
  "Project Management",
  "Other",
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState("");
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    // TODO: Save profile to Supabase
    toast({ title: "Profile Complete!", description: "Your academic profile has been saved." });
    navigate("/dashboard");
  };

  const canProceed = () => {
    if (step === 1) return !!level;
    if (step === 2) return !!course;
    if (step === 3) return !!university;
    return false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <GraduationCap className="h-10 w-10 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary">Set Up Your Profile</h1>
          <p className="text-muted-foreground mt-1">Tell us about your studies so we can tailor your assignments</p>
        </div>

        <Progress value={(step / 3) * 100} className="h-2" />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Step {step} of 3</CardTitle>
            <CardDescription>
              {step === 1 && "What level are you studying at?"}
              {step === 2 && "What course are you enrolled in?"}
              {step === 3 && "Which university do you attend?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      level === l.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{l.label}</span>
                      {level === l.value && <CheckCircle className="h-5 w-5 text-accent" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label>Course / Subject Area</Label>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="university">University Name</Label>
                <Input
                  id="university"
                  placeholder="e.g. University of Manchester"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed()}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Complete Setup
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
