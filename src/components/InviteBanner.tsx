import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingInvite {
  id: string;
  admin_id: string;
  invite_email: string;
  admin_name?: string;
}

export default function InviteBanner() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    const fetchInvites = async () => {
      // Query managed_students where invite_email matches user's email and status is pending
      const { data } = await supabase
        .from("managed_students")
        .select("*")
        .eq("invite_email", user.email!.toLowerCase())
        .eq("status", "pending");

      if (!data || data.length === 0) return;

      // Get admin names
      const adminIds = data.map((d) => d.admin_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", adminIds);

      const nameMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p.full_name || "An administrator"])
      );

      setInvites(
        data.map((inv) => ({
          id: inv.id,
          admin_id: inv.admin_id,
          invite_email: inv.invite_email,
          admin_name: nameMap[inv.admin_id] || "An administrator",
        }))
      );
    };

    fetchInvites();
  }, [user]);

  const handleAccept = async (invite: PendingInvite) => {
    if (!user) return;
    setProcessing(invite.id);
    const { error } = await supabase
      .from("managed_students")
      .update({ status: "accepted", student_id: user.id })
      .eq("id", invite.id);

    if (error) {
      toast.error("Failed to accept invite");
    } else {
      toast.success("Invite accepted! Your administrator can now help manage your assignments.");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    }
    setProcessing(null);
  };

  const handleDecline = async (invite: PendingInvite) => {
    setProcessing(invite.id);
    const { error } = await supabase
      .from("managed_students")
      .update({ status: "revoked" })
      .eq("id", invite.id);

    if (error) {
      toast.error("Failed to decline invite");
    } else {
      toast.success("Invite declined");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    }
    setProcessing(null);
  };

  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-accent/30 bg-accent/5 p-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent flex-shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">{invite.admin_name}</span> wants to manage your
              account. They'll be able to view and create assignments on your behalf.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDecline(invite)}
              disabled={processing === invite.id}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(invite)}
              disabled={processing === invite.id}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
