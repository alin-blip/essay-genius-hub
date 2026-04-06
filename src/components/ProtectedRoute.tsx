import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileCheck, setProfileCheck] = useState<"loading" | "complete" | "incomplete">("loading");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("university_level, course_name, university")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.university_level && data?.course_name && data?.university) {
          setProfileCheck("complete");
        } else {
          setProfileCheck("incomplete");
        }
      });
  }, [user]);

  if (loading || (user && profileCheck === "loading")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileCheck === "incomplete" && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
