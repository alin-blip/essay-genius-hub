import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, Users, FileText, CreditCard, Search, ArrowLeft, Plus, Minus, ExternalLink, Trash2, Star, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAILS = ["admin@assignmentpro.uk", "support@assignmentpro.uk", "alinflorinradu@icloud.com"];

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  university: string | null;
  university_level: string | null;
  credits_balance: number;
  subscription_plan: string;
  account_type: string;
  has_manager_addon: boolean;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  title: string;
  status: string;
  word_count: number;
  target_grade: string;
  assignment_type: string;
  created_at: string;
  updated_at: string;
}

interface FeedbackRow {
  id: string;
  user_id: string;
  rating: number;
  message: string | null;
  category: string;
  allow_case_study: boolean;
  credits_awarded: boolean;
  created_at: string;
  full_name: string;
  university: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAssignments: 0, totalCreditsUsed: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Credit dialog
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; userId: string; name: string; current: number }>({
    open: false, userId: "", name: "", current: 0,
  });
  const [creditAmount, setCreditAmount] = useState(0);

  // Assignments dialog
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; userId: string; name: string }>({
    open: false, userId: "", name: "",
  });
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Feedback
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; title: string }>({
    open: false, id: "", title: "",
  });

  useEffect(() => {
    if (!user) return;
    if (ADMIN_EMAILS.includes(user.email || "")) {
      setIsAdmin(true);
      loadData();
    } else {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action: "get_overview" },
    });
    if (error || data?.error) {
      toast({ title: "Failed to load admin data", variant: "destructive" });
      setLoading(false);
      return;
    }
    setProfiles(data.profiles || []);
    setStats(data.stats || { totalUsers: 0, totalAssignments: 0, totalCreditsUsed: 0 });
    setLoading(false);
    loadFeedback();
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action: "get_feedback" },
    });
    if (!error && !data?.error) {
      setFeedbackList(data.feedback || []);
    }
    setFeedbackLoading(false);
  };

  const handleCreditAdjust = async (add: boolean) => {
    if (creditAmount <= 0) return;
    const { error } = await supabase.functions.invoke("admin-data", {
      body: { action: "adjust_credits", user_id: creditDialog.userId, amount: add ? creditAmount : -creditAmount },
    });
    if (error) {
      toast({ title: "Failed to adjust credits", variant: "destructive" });
      return;
    }
    toast({ title: `Credits ${add ? "added" : "deducted"} successfully` });
    setCreditDialog({ open: false, userId: "", name: "", current: 0 });
    setCreditAmount(0);
    loadData();
  };

  const openAssignments = async (userId: string, name: string) => {
    setAssignDialog({ open: true, userId, name });
    setAssignLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action: "get_user_assignments", user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: "Failed to load assignments", variant: "destructive" });
      setAssignLoading(false);
      return;
    }
    setAssignments(data.assignments || []);
    setAssignLoading(false);
  };

  const handleDeleteAssignment = async () => {
    const { error } = await supabase.functions.invoke("admin-data", {
      body: { action: "delete_assignment", assignment_id: deleteConfirm.id },
    });
    if (error) {
      toast({ title: "Failed to delete assignment", variant: "destructive" });
    } else {
      toast({ title: "Assignment deleted" });
      setAssignments((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
    }
    setDeleteConfirm({ open: false, id: "", title: "" });
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (p.full_name || "").toLowerCase().includes(q) || (p.university || "").toLowerCase().includes(q) || p.user_id.includes(q);
  });

  if (!isAdmin) return null;

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
            <span className="text-lg font-bold text-primary">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </div>
      </nav>

      <div className="container py-8 max-w-7xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <FileText className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCreditsUsed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Credits in Circulation</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="feedback"><MessageSquare className="h-4 w-4 mr-1" /> Feedback ({feedbackList.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Users</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                        <TableCell>{p.university || "—"}</TableCell>
                        <TableCell>{p.university_level || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{p.subscription_plan}</Badge></TableCell>
                        <TableCell>{p.credits_balance.toLocaleString()}</TableCell>
                        <TableCell>
                          {p.has_manager_addon ? <Badge variant="default">Active</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCreditDialog({ open: true, userId: p.user_id, name: p.full_name || "User", current: p.credits_balance })}>
                              <CreditCard className="h-3 w-3 mr-1" /> Credits
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => openAssignments(p.user_id, p.full_name || "User")}>
                              <FileText className="h-3 w-3 mr-1" /> Assignments
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-accent border-t-transparent" />
                  </div>
                ) : feedbackList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No feedback yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>University</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Case Study</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackList.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.full_name}</TableCell>
                          <TableCell>{f.university}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`h-4 w-4 ${s <= f.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{f.message || "—"}</TableCell>
                          <TableCell>
                            {f.allow_case_study ? <Badge variant="default">Yes</Badge> : <span className="text-muted-foreground">No</span>}
                          </TableCell>
                          <TableCell className="text-xs">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Credit adjustment dialog */}
      <Dialog open={creditDialog.open} onOpenChange={(o) => setCreditDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits — {creditDialog.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: {creditDialog.current.toLocaleString()}</p>
          <Input type="number" placeholder="Amount" value={creditAmount || ""} onChange={(e) => setCreditAmount(Number(e.target.value))} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleCreditAdjust(false)} disabled={creditAmount <= 0}>
              <Minus className="h-4 w-4 mr-1" /> Deduct
            </Button>
            <Button onClick={() => handleCreditAdjust(true)} disabled={creditAmount <= 0}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignments dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(o) => setAssignDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignments — {assignDialog.name}</DialogTitle>
          </DialogHeader>
          {assignLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No assignments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell className="capitalize">{a.assignment_type}</TableCell>
                    <TableCell className="capitalize">{a.target_grade}</TableCell>
                    <TableCell>{a.word_count.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/assignment/${a.id}`)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: a.id, title: a.title })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm((prev) => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
