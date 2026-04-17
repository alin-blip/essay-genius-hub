import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UserPlus, Users, Search, Trash2, FolderOpen, Mail, Clock, CheckCircle, XCircle,
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ManagedStudent {
  id: string;
  admin_id: string;
  student_id: string | null;
  invite_email: string;
  status: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800", icon: Clock },
  accepted: { label: "Active", className: "bg-green-100 text-green-800", icon: CheckCircle },
  revoked: { label: "Revoked", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function AdminStudents() {
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<ManagedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    if (!subscription.loading && !subscription.hasManagerAddon) {
      navigate("/plans#manager");
    }
  }, [subscription, navigate]);

  const fetchStudents = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("managed_students")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load students");
      return;
    }

    // Fetch student names for accepted invites
    const accepted = (data || []).filter((s) => s.student_id);
    let nameMap: Record<string, string> = {};
    if (accepted.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", accepted.map((s) => s.student_id!));
      if (profiles) {
        nameMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name || ""]));
      }
    }

    setStudents(
      (data || []).map((s) => ({
        ...s,
        student_name: s.student_id ? nameMap[s.student_id] || s.invite_email : undefined,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  // Realtime: listen for invite status changes (e.g. student accepts)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`managed-students-changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'managed_students',
          filter: `admin_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'accepted') {
            toast.success(`Student ${updated.invite_email} has accepted your invitation!`);
          }
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleInvite = async () => {
    if (!user || !inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const email = inviteEmail.trim().toLowerCase();

      // Check if already invited
      const existing = students.find((s) => s.invite_email === email && s.status !== "revoked");
      if (existing) {
        toast.error("This student has already been invited");
        setInviteLoading(false);
        return;
      }

      const { error } = await supabase.from("managed_students").insert({
        admin_id: user.id,
        invite_email: email,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This student has already been invited");
        } else {
          toast.error("Failed to send invite");
        }
        setInviteLoading(false);
        return;
      }

      // Send invite email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "student-invite",
          recipientEmail: email,
          idempotencyKey: `student-invite-${user.id}-${email}`,
          templateData: {
            adminName: profile?.full_name || user.email,
            adminEmail: user.email,
          },
        },
      });

      toast.success("Invite sent successfully!");
      setInviteEmail("");
      setInviteOpen(false);
      fetchStudents();
    } catch {
      toast.error("Something went wrong");
    }
    setInviteLoading(false);
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    const { error } = await supabase
      .from("managed_students")
      .update({ status: "revoked", student_id: null })
      .eq("id", revokeId);

    if (error) {
      toast.error("Failed to revoke access");
    } else {
      toast.success("Access revoked");
      fetchStudents();
    }
    setRevokeId(null);
  };

  const filtered = students.filter(
    (s) =>
      s.invite_email.toLowerCase().includes(search.toLowerCase()) ||
      (s.student_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = students.filter((s) => s.status === "accepted").length;
  const pendingCount = students.filter((s) => s.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Managed Students</h1>
            <p className="text-muted-foreground">
              Invite students and manage their assignments
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{students.length}</p>
                  <p className="text-sm text-muted-foreground">Total Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No students yet</p>
              <p className="text-sm">Invite students to start managing their assignments</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const config = STATUS_CONFIG[student.status] || STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {student.student_name || student.invite_email}
                          </p>
                          {student.student_name && (
                            <p className="text-sm text-muted-foreground">
                              {student.invite_email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.className} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.status === "accepted" && student.student_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/library?student=${student.student_id}`)}
                              className="gap-1"
                            >
                              <FolderOpen className="h-3 w-3" />
                              Library
                            </Button>
                          )}
                          {student.status !== "revoked" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevokeId(student.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a Student</DialogTitle>
            <DialogDescription>
              Enter the student's email address. They'll receive an invitation to connect their account.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="student@university.ac.uk"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove your access to this student's assignments and folders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
