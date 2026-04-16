import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GraduationCap, ArrowLeft, Save, KeyRound, Crown, ExternalLink, Sparkles, Download, Trash2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

const LEVELS = [
  { value: "hnd_level5", label: "HND Level 5" },
  { value: "bsc_level6", label: "BSc Level 6" },
  { value: "msc_level7", label: "MSc Level 7" },
];

const COURSES = [
  "Construction Management",
  "Business Management",
  "Health & Social Care",
  "Computing & IT",
  "Accounting & Finance",
  "Engineering",
  "Tourism & Hospitality",
  "Law",
  "Education",
  "Psychology",
  "Other",
];

const Settings = () => {
  const { user, subscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [universityLevel, setUniversityLevel] = useState("");
  const [courseName, setCourseName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Account data
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setUniversity(data.university || "");
          setUniversityLevel(data.university_level || "");
          setCourseName(data.course_name || "");
        }
        setLoading(false);
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        university,
        university_level: universityLevel,
        course_name: courseName,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated ✓" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters required.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✓" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profileRes, assignmentsRes, foldersRes, feedbackRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id),
        supabase.from("assignments").select("*").eq("user_id", user.id),
        supabase.from("folders").select("*").eq("user_id", user.id),
        supabase.from("feedback").select("*").eq("user_id", user.id),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email, created_at: user.created_at },
        profile: profileRes.data?.[0] ?? null,
        assignments: assignmentsRes.data ?? [],
        folders: foldersRes.data ?? [],
        feedback: feedbackRes.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myunipal-data-${user.id.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported ✓", description: "Your data has been downloaded as JSON." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      sonnerToast.success("Your account has been deleted.");
      navigate("/");
    } catch (e: any) {
      toast({ title: "Deletion failed", description: e.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="bg-secondary/20 min-h-full">

      <div className="container py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal and academic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" />
            </div>

            <div className="space-y-2">
              <Label>University Level</Label>
              <Select value={universityLevel} onValueChange={setUniversityLevel}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseName} onValueChange={setCourseName}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {COURSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>University</Label>
              <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. University of London" />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
                <KeyRound className="h-4 w-4 mr-2" />
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-foreground font-medium flex items-center gap-2">
                  {subscription.planTier?.name || "Free"}
                  {subscription.subscribed && <Badge className="bg-accent/10 text-accent text-xs">Active</Badge>}
                </p>
              </div>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/plans">
                  {subscription.subscribed ? "Change Plan" : "Upgrade"}
                </Link>
              </Button>
            </div>
            {subscription.subscribed && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Renews on</p>
                    <p className="text-foreground">
                      {subscription.subscriptionEnd
                        ? new Date(subscription.subscriptionEnd).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke("customer-portal");
                        if (error) throw error;
                        if (data?.url) window.open(data.url, "_blank");
                      } catch (err: any) {
                        sonnerToast.error(err.message || "Failed to open billing portal");
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> Billing Portal
                  </Button>
                </div>
                {subscription.hasManagerAddon && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <p className="text-sm text-foreground">
                        Assignment Manager: <span className="font-medium capitalize">{subscription.managerTier?.replace("_", " ")}</span>
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default Settings;
