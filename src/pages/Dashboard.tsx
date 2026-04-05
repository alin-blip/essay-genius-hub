import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Plus,
  FileText,
  CreditCard,
  Award,
  TrendingUp,
  Settings,
  LogOut,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
              {LEVEL_LABELS[profile?.university_level] || "Student"} · {profile?.course_name || "No course set"}
            </p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/new-assignment">
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CreditCard, label: "Credits Remaining", value: (profile?.credits_balance ?? 0).toLocaleString(), sub: "words" },
            { icon: FileText, label: "Assignments This Month", value: String(thisMonthCount), sub: "completed" },
            { icon: Award, label: "Total Assignments", value: String(assignments.length), sub: "all time" },
            { icon: TrendingUp, label: "Subscription", value: (profile?.subscription_plan || "free").charAt(0).toUpperCase() + (profile?.subscription_plan || "free").slice(1), sub: profile?.subscription_plan === "free" ? "5,000 words/mo" : "Active" },
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
    </div>
  );
};

export default Dashboard;
