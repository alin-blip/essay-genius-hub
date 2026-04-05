import { Link } from "react-router-dom";
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
  Clock,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Generating: "bg-accent/20 text-accent-foreground",
  Completed: "bg-green-100 text-green-800",
};

const MOCK_ASSIGNMENTS = [
  { id: "1", title: "HRM Strategy Analysis", module: "Unit 5 - HRM", type: "Essay", wordCount: 3000, grade: "Merit", status: "Completed", date: "2026-04-02" },
  { id: "2", title: "Construction Site Safety Report", module: "Unit 12 - H&S", type: "Report", wordCount: 4500, grade: "Distinction", status: "Completed", date: "2026-04-01" },
  { id: "3", title: "Business Plan Analysis", module: "Unit 3 - Business", type: "Case Study", wordCount: 2500, grade: "Pass", status: "Draft", date: "2026-03-30" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-secondary/20">
      {/* Top Nav */}
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
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back! 👋</h1>
            <p className="text-muted-foreground">BSc Level 6 · Construction Management</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/new-assignment">
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CreditCard, label: "Credits Remaining", value: "5,000", sub: "words" },
            { icon: FileText, label: "Assignments This Month", value: "3", sub: "completed" },
            { icon: Award, label: "Average Grade Target", value: "Merit", sub: "60-69%" },
            { icon: TrendingUp, label: "Subscription", value: "Free", sub: "5,000 words/mo" },
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

        {/* Assignments Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Assignments</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent">View All</Button>
          </CardHeader>
          <CardContent>
            {MOCK_ASSIGNMENTS.length > 0 ? (
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
                  {MOCK_ASSIGNMENTS.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{a.module}</TableCell>
                      <TableCell className="hidden md:table-cell">{a.type}</TableCell>
                      <TableCell>{a.wordCount.toLocaleString()}</TableCell>
                      <TableCell>{a.grade}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[a.status]}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{a.date}</TableCell>
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
