import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Capture referral code from URL (affiliate + friend)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("ref_code", ref);
      localStorage.setItem("ref_ts", Date.now().toString());
      localStorage.setItem("friend_ref_code", ref);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({ title: "Please accept the Terms", description: "You must agree to our Terms and Privacy Policy to create an account.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } else {
      // Link referral if applicable
      const refCode = localStorage.getItem("ref_code");
      const refTs = localStorage.getItem("ref_ts");
      const isValid = refCode && refTs && Date.now() - parseInt(refTs) < 30 * 24 * 60 * 60 * 1000;
      if (isValid) {
        // Fire-and-forget: look up affiliate and insert referral
        supabase
          .from("affiliates")
          .select("id")
          .eq("affiliate_code", refCode)
          .eq("status", "approved")
          .maybeSingle()
          .then(({ data: aff }) => {
            if (aff) {
              // We need the new user's ID. Since email confirmation is required,
              // we'll store the ref info and link on first login instead.
              localStorage.setItem("ref_affiliate_id", aff.id);
            }
          });
      }
      toast({ title: "Check your email", description: "We've sent you a confirmation link to verify your account." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Seo
        title="Sign up — MyUniPal"
        description="Create your free MyUniPal account and get 5,000 free words. AI-powered UK university assignment writing with Harvard referencing — no credit card required."
        path="/signup"
      />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <GraduationCap className="h-10 w-10 text-accent" />
            <span className="text-2xl font-bold text-primary">AssignmentPro</span>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start with 5,000 free words — no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@university.ac.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree" className="text-xs text-muted-foreground font-normal leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-accent hover:underline">Terms of Service</Link>,{" "}
                  <Link to="/privacy" target="_blank" className="text-accent hover:underline">Privacy Policy</Link>, and{" "}
                  <Link to="/acceptable-use" target="_blank" className="text-accent hover:underline">Acceptable Use Policy</Link>. I understand MyUniPal is a study aid and that submitting AI-generated work as my own may breach my university's academic integrity policy.
                </Label>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !agreed}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-accent font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
