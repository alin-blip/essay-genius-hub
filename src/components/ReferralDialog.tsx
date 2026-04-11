import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FriendReferral {
  id: string;
  referred_id: string;
  status: string;
  credits_awarded: boolean;
  created_at: string;
}

export default function ReferralDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<FriendReferral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    // Fetch referral code from profile
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.referral_code) setReferralCode(data.referral_code);
      });

    // Fetch friend referrals
    supabase
      .from("friend_referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReferrals(data as FriendReferral[]);
      });
  }, [open, user]);

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const creditsEarned = referrals.filter((r) => r.credits_awarded).length * 1500;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-accent" />
            Invite Friends — Get 1,500 Credits
          </DialogTitle>
          <DialogDescription>
            Share your unique link. When your friend signs up and uses their credits, you'll get <strong>1,500 bonus words</strong> automatically!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Referral link */}
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm select-all"
            />
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-accent">{creditsEarned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Credits Earned</p>
            </div>
          </div>

          {/* Referral list */}
          {referrals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-1">
                <Users className="h-4 w-4" /> Your Referrals
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Friend #{r.referred_id.slice(0, 6)}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        r.credits_awarded
                          ? "bg-green-500/15 text-green-600 border-green-500/30"
                          : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                      }
                    >
                      {r.credits_awarded ? "Credits Earned ✓" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
