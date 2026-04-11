import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Users,
  FileText,
  CreditCard,
  Search,
  ArrowLeft,
  Plus,
  Minus,
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAssignments: 0, totalCreditsUsed: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; userId: string; name: string; current: number }>({
    open: false, userId: "", name: "", current: 0,
  });
  const [creditAmount, setCreditAmount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Check admin via email (server-side would be better, but this is a start)
    if (ADMIN_EMAILS.includes(user.email || "")) {
      setIsAdmin(true);
      loadData();
    } else {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    // Note: Admin needs service_role to see all profiles.
    // For now, we fetch via edge function
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
  };

  const handleCreditAdjust = async (add: boolean) => {
    if (creditAmount <= 0) return;
    const { error } = await supabase.functions.invoke("admin-data", {
      body: {
        action: "adjust_credits",
        user_id: creditDialog.userId,
        amount: add ? creditAmount : -creditAmount,
      },
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

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.university || "").toLowerCase().includes(q) ||
      p.user_id.includes(q)
    );
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

        {/* User table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
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
                    <TableCell>
                      <Badge variant="secondary">{p.subscription_plan}</Badge>
                    </TableCell>
                    <TableCell>{p.credits_balance.toLocaleString()}</TableCell>
                    <TableCell>
                      {p.has_manager_addon ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          setCreditDialog({
                            open: true,
                            userId: p.user_id,
                            name: p.full_name || "User",
                            current: p.credits_balance,
                          })
                        }
                      >
                        <CreditCard className="h-3 w-3 mr-1" /> Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Credit adjustment dialog */}
      <Dialog open={creditDialog.open} onOpenChange={(o) => setCreditDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits — {creditDialog.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Current balance: {creditDialog.current.toLocaleString()}</p>
          <Input
            type="number"
            placeholder="Amount"
            value={creditAmount || ""}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
          />
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
    </div>
  );
};

export default AdminDashboard;
