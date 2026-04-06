import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, TrendingUp, DollarSign, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AffiliateApply = () => {
  const { user, loading: authLoading } = useAuth();
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAffiliate, setExistingAffiliate] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setExistingAffiliate(data);
        setChecking(false);
      });
  }, [user]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please sign in first", description: "You need an account to apply.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      affiliate_code: generateCode(),
      website: website || null,
      social_media: socialMedia || null,
      reason,
    });
    if (error) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "We'll review it and get back to you soon." });
      navigate("/affiliate/dashboard");
    }
    setLoading(false);
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (existingAffiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Already Applied</CardTitle>
            <CardDescription>
              Your application is <span className="font-semibold capitalize">{existingAffiliate.status}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/affiliate/dashboard")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Go to Affiliate Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-accent" />
            <span className="text-2xl font-bold text-primary">AssignmentPro</span>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-4">Affiliate Programme</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Earn <span className="text-accent font-bold">30% recurring commission</span> for every student you refer. 
            Paid directly to your bank account via Stripe every month.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Users className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-primary mb-1">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">Get a unique referral link to share with students</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingUp className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-primary mb-1">They Subscribe</h3>
              <p className="text-sm text-muted-foreground">When referred students sign up and subscribe</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <DollarSign className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-primary mb-1">You Earn 30%</h3>
              <p className="text-sm text-muted-foreground">Recurring monthly commission, paid via Stripe</p>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Apply Now</CardTitle>
            <CardDescription>
              {user ? "Fill in the form below to apply" : "You need an account to apply"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Please sign in or create an account first.</p>
                <div className="flex gap-3 justify-center">
                  <Button asChild variant="outline"><Link to="/login">Sign In</Link></Button>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/signup">Create Account</Link></Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website / Blog (optional)</Label>
                  <Input id="website" placeholder="https://yourblog.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social">Social Media (optional)</Label>
                  <Input id="social" placeholder="@yourhandle on TikTok, Instagram, etc." value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Why do you want to join? *</Label>
                  <Textarea id="reason" placeholder="Tell us how you'd promote AssignmentPro..." value={reason} onChange={(e) => setReason(e.target.value)} required minLength={20} />
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateApply;
