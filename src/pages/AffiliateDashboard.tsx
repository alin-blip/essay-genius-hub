import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowLeft, Copy, ExternalLink, Users, TrendingUp, PoundSterling, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!aff) {
        navigate("/affiliate");
        return;
      }
      setAffiliate(aff);

      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false });
      const refList = refs || [];
      setReferrals(refList);

      // Fetch profiles for referred users
      const userIds = refList.map((r) => r.referred_user_id);
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p) => { map[p.user_id] = p.full_name || "Unknown"; });
        setProfileMap(map);
      }

      const { data: pays } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", aff.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPayouts(pays || []);

      setLoading(false);
    };
    fetchData();
  }, [user, navigate]);

  const referralLink = affiliate
    ? `${window.location.origin}/?ref=${affiliate.affiliate_code}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-connect", {
        body: { affiliate_id: affiliate.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to start Stripe onboarding", variant: "destructive" });
    }
    setConnectLoading(false);
  };

  const totalEarnings = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount_pence, 0);

  const thisMonthEarnings = payouts
    .filter((p) => {
      const d = new Date(p.created_at);
      const now = new Date();
      return p.status === "completed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount_pence, 0);

  const subscribedCount = referrals.filter((r) => r.status === "subscribed").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-accent" />
              <h1 className="text-2xl font-bold text-primary">Affiliate Dashboard</h1>
            </div>
          </div>
          <Badge className={STATUS_BADGE[affiliate?.status] || ""}>
            {affiliate?.status?.toUpperCase()}
          </Badge>
        </div>

        {affiliate?.status === "pending" && (
          <Card className="mb-6 border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <p className="text-foreground">Your application is under review. We'll notify you once it's approved.</p>
            </CardContent>
          </Card>
        )}

        {affiliate?.status === "rejected" && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive">Your application was not approved. Please contact support for more details.</p>
            </CardContent>
          </Card>
        )}

        {affiliate?.status === "approved" && (
          <>
            {!affiliate.stripe_connect_account_id && (
              <Card className="mb-6 border-accent/30 bg-accent/5">
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary">Connect your Stripe account to receive payouts</p>
                    <p className="text-sm text-muted-foreground">Set up Stripe Connect to start receiving commissions.</p>
                  </div>
                  <Button onClick={handleConnectStripe} disabled={connectLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {connectLoading ? "Loading..." : "Connect Stripe"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardContent className="pt-6">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Your Referral Link</Label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm break-all">{referralLink}</code>
                  <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{referrals.length}</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{subscribedCount}</p>
                  <p className="text-sm text-muted-foreground">Active Subscribers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <PoundSterling className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">£{(thisMonthEarnings / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <PoundSterling className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">£{(totalEarnings / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {affiliate?.status === "approved" && payouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>£{(p.amount_pence / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) => (
  <label className={className} {...props}>{children}</label>
);

export default AffiliateDashboard;
