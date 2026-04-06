import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Plus, FileText, CreditCard, Award, TrendingUp,
  Settings, LogOut, Trash2, Sparkles, Crown,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MANAGER_ADDON } from "@/lib/subscription-tiers";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-accent/20 text-accent-foreground",
  completed: "bg-green-100 text-green-800",
};

const LEVEL_LABELS: Record<string, string> = {
  hnd_level5: "HND Level 5",
  bsc_level6: "BSc Level 6",
  msc_level7: "MSc Level 7",
};

const GRADE_LABELS: Record<string, string> = {
  pass: "Pass",
  merit: "Merit",
  distinction_lower: "2:1",
  distinction: "First",
};

const Dashboard = () => {
  const { user, signOut, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [assignments, setAssignments] = useState<Tables<"assignments">[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Show upsell after successful checkout
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      refreshSubscription();
      setTimeout(() => {
        if (!subscription.hasManagerAddon) setShowUpsell(true);
      }, 2000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, assignmentsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("assignments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("assignments").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete assignment");
    } else {
      setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Assignment deleted");
    }
    setDeleteTarget(null);
  };

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const thisMonthCount = assignments.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const planName = subscription.planTier?.name || "Free";
  const isSubscribed = subscription.subscribed;

  return (
    <div className="min-h-screen bg-secondary/20">
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-accent" />
            <span className="text-lg font-bold text-primary">AssignmentPro</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings"><Settings className="h-4 w-4 mr-1" /> Settings</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
            </h1>
            <p className="text-muted-foreground">
              {LEVEL_LABELS[profile?.university_level ?? ""] || "Student"} · {profile?.course_name || "No course set"}
            </p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/new-assignment">
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Link>
          </Button>
        </div>

        {/* Subscription Banner */}
        {!isSubscribed && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium text-foreground">You're on the Free plan</p>
                  <p className="text-sm text-muted-foreground">Upgrade to unlock more assignments and features.</p>
                </div>
              </div>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/#pricing">View Plans</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CreditCard, label: "Credits Remaining", value: (profile?.credits_balance ?? 0).toLocaleString(), sub: "words" },
            { icon: FileText, label: "Assignments This Month", value: String(thisMonthCount), sub: "completed" },
            { icon: Award, label: "Total Assignments", value: String(assignments.length), sub: "all time" },
            {
              icon: TrendingUp,
              label: "Plan",
              value: planName,
              sub: isSubscribed
                ? subscription.hasManagerAddon ? "Manager Active ✨" : "Active"
                : "Free tier",
            },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subscription management */}
        {isSubscribed && (
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleCustomerPortal}>
              Manage Subscription
            </Button>
            {!subscription.hasManagerAddon && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpsell(true)}
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Add Assignment Manager
              </Button>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Module</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/assignment/${a.id}`)}
                    >
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{a.module_name || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{a.assignment_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell>{a.word_count?.toLocaleString()}</TableCell>
                      <TableCell>{GRADE_LABELS[a.target_grade] || a.target_grade}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[a.status] || ""}>
                          {a.status?.charAt(0).toUpperCase() + a.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: a.id, title: a.title });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <h3 className="text-lg font-medium text-foreground">No assignments yet</h3>
                <p className="text-muted-foreground">Create your first assignment to get started</p>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/new-assignment">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Assignment
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteTarget?.title}</strong>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manager Upsell Dialog */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Assignment Manager
            </DialogTitle>
            <DialogDescription>{MANAGER_ADDON.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">£{MANAGER_ADDON.priceGBP}<span className="text-base font-normal text-muted-foreground">/month</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpsell(false)}>Maybe Later</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={checkoutLoading}
              onClick={() => {
                setShowUpsell(false);
                handleCheckout(MANAGER_ADDON.priceId);
              }}
            >
              Add Assignment Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
