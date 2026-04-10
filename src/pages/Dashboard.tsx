import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, FileText, CreditCard, Award, TrendingUp,
  Trash2, Sparkles, Crown, AlertTriangle,
  Search, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MANAGER_ADDONS } from "@/lib/subscription-tiers";
import { Progress } from "@/components/ui/progress";
import UsageHistoryChart from "@/components/dashboard/UsageHistoryChart";
import WordUsageCard from "@/components/dashboard/WordUsageCard";
import InviteBanner from "@/components/InviteBanner";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";

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
  const [allAssignments, setAllAssignments] = useState<Tables<"assignments">[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [limitEmailSent, setLimitEmailSent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"title" | "created_at" | "status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const ITEMS_PER_PAGE = 10;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAssignments = assignments
    .filter((a) => {
      if (filterType !== "all" && a.assignment_type !== filterType) return false;
      if (filterGrade !== "all" && a.target_grade !== filterGrade) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.module_name || "").toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q) ||
        a.assignment_type.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "title") return dir * a.title.localeCompare(b.title);
      if (sortKey === "status") return dir * a.status.localeCompare(b.status);
      return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

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
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [profileRes, recentRes, allRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("assignments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("assignments").select("id, created_at").eq("user_id", user.id).gte("created_at", sixMonthsAgo.toISOString()).order("created_at", { ascending: false }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (recentRes.data) setAssignments(recentRes.data);
      if (allRes.data) setAllAssignments(allRes.data as any);
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

  const thisMonthCount = allAssignments.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const monthlyLimit = subscription.planTier?.assignmentsPerMonth ?? null;
  const usagePercent = monthlyLimit ? Math.min((thisMonthCount / monthlyLimit) * 100, 100) : null;

  // Send email notification at 80% usage
  useEffect(() => {
    if (!user || !profile || limitEmailSent || !monthlyLimit) return;
    if (usagePercent !== null && usagePercent >= 80 && usagePercent < 100) {
      setLimitEmailSent(true);
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "usage-limit-warning",
          recipientEmail: user.email,
          idempotencyKey: `usage-limit-${user.id}-${new Date().getFullYear()}-${new Date().getMonth()}`,
          templateData: {
            name: profile.full_name || undefined,
            used: thisMonthCount,
            limit: monthlyLimit,
            planName: subscription.planTier?.name,
          },
        },
      });
    }
  }, [usagePercent, user, profile, limitEmailSent, monthlyLimit, thisMonthCount, subscription.planTier?.name]);

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
    <DashboardLayout>
    <div className="bg-secondary/20 min-h-full">

      <div className="container py-8 space-y-8">
        <InviteBanner />
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
                <Link to="/plans">View Plans</Link>
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

        {/* Monthly Usage Indicator */}
        {monthlyLimit !== null && (
          <Card className={usagePercent! >= 100 ? "border-destructive/50 bg-destructive/5" : usagePercent! >= 80 ? "border-amber-500/30 bg-amber-50/50" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {usagePercent! >= 100 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-accent" />
                  )}
                  <span className="text-sm font-medium text-foreground">Monthly Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {thisMonthCount} / {monthlyLimit} assignments
                </span>
              </div>
              <Progress value={usagePercent!} className="h-2" />
              {usagePercent! >= 100 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-destructive">You've reached your monthly limit.</p>
                  <Button asChild size="sm" variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
                    <Link to="/plans">
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade
                    </Link>
                  </Button>
                </div>
              )}
              {usagePercent! >= 80 && usagePercent! < 100 && (
                <p className="text-xs text-amber-600">You're almost at your monthly limit. {monthlyLimit - thisMonthCount} assignments remaining.</p>
              )}
            </CardContent>
          </Card>
        )}
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

        {/* Low Credits Banner */}
        {(profile?.credits_balance ?? 0) < 500 && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-foreground">Running low on words</p>
                  <p className="text-sm text-muted-foreground">
                    You have {(profile?.credits_balance ?? 0).toLocaleString()} words remaining. Upgrade to keep generating assignments.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/plans">Upgrade Now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manager Upsell Card */}
        {!subscription.hasManagerAddon && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">Assignment Manager</h3>
                    <Badge className="bg-amber-500 text-white text-[10px]">🎓 Early Bird</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let a real person handle your assignments — from generation to upload. Starting from £{MANAGER_ADDONS[0]?.priceGBP}/mo.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 whitespace-nowrap">
                <Link to="/plans#manager">View Plans</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Word Usage Card */}
        <WordUsageCard
          creditsBalance={profile?.credits_balance ?? 0}
          totalWords={subscription.planTier?.wordsPerMonth ?? null}
          assignments={assignments}
        />

        {/* Usage History Chart */}
        <UsageHistoryChart assignments={allAssignments as Tables<"assignments">[]} />

        <Card>
          <CardHeader className="flex flex-col gap-3 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Assignments</CardTitle>
              {assignments.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search assignments..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>
            {assignments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="literature_review">Literature Review</SelectItem>
                    <SelectItem value="research_paper">Research Paper</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="merit">Merit</SelectItem>
                    <SelectItem value="distinction_lower">2:1</SelectItem>
                    <SelectItem value="distinction">First</SelectItem>
                  </SelectContent>
                </Select>
                {(filterType !== "all" || filterGrade !== "all") && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterType("all"); setFilterGrade("all"); setCurrentPage(1); }}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {assignments.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button onClick={() => handleSort("title")} className="flex items-center hover:text-foreground transition-colors">
                          Title <SortIcon col="title" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Module</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>
                        <button onClick={() => handleSort("status")} className="flex items-center hover:text-foreground transition-colors">
                          Status <SortIcon col="status" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <button onClick={() => handleSort("created_at")} className="flex items-center hover:text-foreground transition-colors">
                          Date <SortIcon col="created_at" />
                        </button>
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No assignments match "{searchQuery}"
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssignments
                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                        .map((a) => (
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
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="secondary" className={STATUS_COLORS[a.status] || ""}>
                                {a.status?.charAt(0).toUpperCase() + a.status?.slice(1)}
                              </Badge>
                              {a.status === "completed" && (() => {
                                const meta = a.generation_metadata as any;
                                const aiScore = meta?.ai_detection?.human_score;
                                const simScore = meta?.similarity?.overall_similarity;
                                return (
                                  <>
                                    {aiScore != null && (
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${aiScore >= 70 ? "border-green-500 text-green-700" : aiScore >= 40 ? "border-amber-500 text-amber-700" : "border-destructive text-destructive"}`}>
                                        {aiScore}% human
                                      </Badge>
                                    )}
                                    {simScore != null && (
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${simScore <= 10 ? "border-green-500 text-green-700" : simScore <= 25 ? "border-amber-500 text-amber-700" : "border-destructive text-destructive"}`}>
                                        {simScore}% sim
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
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
                      ))
                    )}
                  </TableBody>
                </Table>
                {(() => {
                  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
                  if (totalPages <= 1) return null;
                  return (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssignments.length)} of {filteredAssignments.length}
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((item, idx) =>
                              item === "ellipsis" ? (
                                <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
                              ) : (
                                <PaginationItem key={item}>
                                  <PaginationLink
                                    isActive={currentPage === item}
                                    onClick={() => setCurrentPage(item as number)}
                                    className="cursor-pointer"
                                  >
                                    {item}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            )}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  );
                })()}
              </>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Assignment Manager
            </DialogTitle>
            <DialogDescription>Let a real person handle your assignments — from generation to upload.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-4 py-4">
            {MANAGER_ADDONS.map((addon) => (
              <Card key={addon.key} className={`relative ${addon.highlighted ? "border-accent shadow-md" : "border"}`}>
                {addon.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-accent text-accent-foreground text-center text-[10px] font-semibold py-1">
                    BEST VALUE
                  </div>
                )}
                <CardContent className={`p-4 space-y-3 ${addon.highlighted ? "pt-8" : ""}`}>
                  <h4 className="font-semibold text-sm text-foreground">{addon.name}</h4>
                  <Badge className="bg-amber-500 text-white text-[10px] mb-1">🎓 Early Bird</Badge>
                  <p className="text-2xl font-bold text-primary">
                    £{addon.priceGBP}
                    <span className="text-xs font-normal text-muted-foreground">{addon.billing}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                  <Button
                    size="sm"
                    className={`w-full ${addon.highlighted ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                    variant={addon.highlighted ? "default" : "outline"}
                    disabled={checkoutLoading}
                    onClick={() => {
                      setShowUpsell(false);
                      handleCheckout(addon.priceId);
                    }}
                  >
                    Choose
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpsell(false)}>Maybe Later</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default Dashboard;
