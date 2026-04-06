import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await response.json();

        if (!response.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validateToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });

      if (error) throw error;

      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <GraduationCap className="h-10 w-10 text-accent mx-auto mb-3" />
          <h1 className="text-xl font-bold text-primary">AssignmentPro</h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">
              {status === "loading" && "Verifying..."}
              {status === "valid" && "Unsubscribe from Emails"}
              {status === "already" && "Already Unsubscribed"}
              {status === "invalid" && "Invalid Link"}
              {status === "success" && "Unsubscribed Successfully"}
              {status === "error" && "Something Went Wrong"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" && (
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            )}

            {status === "valid" && (
              <>
                <p className="text-muted-foreground text-sm">
                  Are you sure you want to unsubscribe from AssignmentPro emails?
                  You'll no longer receive assignment notifications or credit alerts.
                </p>
                <Button
                  onClick={handleUnsubscribe}
                  disabled={processing}
                  variant="destructive"
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Unsubscribe"
                  )}
                </Button>
              </>
            )}

            {status === "already" && (
              <div className="space-y-3">
                <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">
                  You've already unsubscribed from these emails. No further action needed.
                </p>
              </div>
            )}

            {status === "invalid" && (
              <div className="space-y-3">
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-muted-foreground text-sm">
                  This unsubscribe link is invalid or has expired. If you need help,
                  please contact our support team.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-3">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  You've been successfully unsubscribed. You won't receive any more
                  emails from AssignmentPro.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Something went wrong while processing your request. Please try again later.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Unsubscribe;
