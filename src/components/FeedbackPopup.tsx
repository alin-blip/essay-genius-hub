import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Star, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const FeedbackPopup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [allowCaseStudy, setAllowCaseStudy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkShouldShow();
  }, [user]);

  const checkShouldShow = async () => {
    // Check if user has at least 1 completed assignment
    const { count: assignCount } = await supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "completed");

    if (!assignCount || assignCount < 1) return;

    // Check last feedback date
    const { data: lastFeedback } = await supabase
      .from("feedback")
      .select("created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastFeedback && lastFeedback.length > 0) {
      const lastDate = new Date(lastFeedback[0].created_at);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Small delay so it doesn't pop immediately
    setTimeout(() => setOpen(true), 3000);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // Insert feedback
      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: user!.id,
        rating,
        message: message.trim() || null,
        category: "general",
        allow_case_study: allowCaseStudy,
      });

      if (insertError) throw insertError;

      // Award credits via edge function
      const { error: creditError } = await supabase.functions.invoke("admin-data", {
        body: { action: "award_feedback_credits", user_id: user!.id },
      });

      if (creditError) {
        console.error("Credit award error:", creditError);
      }

      toast({
        title: "Thank you for your feedback! 🎉",
        description: "100 credits have been added to your account.",
      });
      setOpen(false);
      setRating(0);
      setMessage("");
      setAllowCaseStudy(false);
    } catch (err: any) {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-accent" />
            Share Your Experience — Earn 100 Credits!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell us how AssignmentPro is helping you. Your feedback helps us improve and you'll receive <strong>100 free credits</strong>!
          </p>

          {/* Star rating */}
          <div>
            <Label className="text-sm font-medium">Rating</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="feedback-msg" className="text-sm font-medium">
              Your feedback (optional)
            </Label>
            <Textarea
              id="feedback-msg"
              placeholder="What do you like? What could be better?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Case study consent */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="case-study"
              checked={allowCaseStudy}
              onCheckedChange={(c) => setAllowCaseStudy(c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="case-study" className="text-sm text-muted-foreground leading-tight">
              I consent to my feedback being used anonymously in case studies
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Submitting..." : "Submit & Earn 100 Credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackPopup;
