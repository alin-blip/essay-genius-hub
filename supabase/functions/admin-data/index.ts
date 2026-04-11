import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAILS = ["admin@assignmentpro.uk", "support@assignmentpro.uk", "alinflorinradu@icloud.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    if (!ADMIN_EMAILS.includes(userData.user.email || "")) {
      throw new Error("Unauthorized — admin access only");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, user_id, amount, assignment_id } = await req.json();

    if (action === "get_overview") {
      const { data: profiles, error: profError } = await serviceClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profError) throw new Error(profError.message);

      const { count: assignmentCount } = await serviceClient
        .from("assignments")
        .select("*", { count: "exact", head: true });

      const totalCredits = (profiles || []).reduce((sum: number, p: any) => sum + (p.credits_balance || 0), 0);

      return new Response(
        JSON.stringify({
          profiles: profiles || [],
          stats: {
            totalUsers: (profiles || []).length,
            totalAssignments: assignmentCount || 0,
            totalCreditsUsed: totalCredits,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "adjust_credits") {
      if (!user_id || amount === undefined) throw new Error("user_id and amount required");

      const { data: profile, error: getError } = await serviceClient
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", user_id)
        .single();

      if (getError || !profile) throw new Error("User not found");

      const newBalance = Math.max(0, profile.credits_balance + amount);
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ credits_balance: newBalance })
        .eq("user_id", user_id);

      if (updateError) throw new Error(updateError.message);

      return new Response(
        JSON.stringify({ success: true, new_balance: newBalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "get_user_assignments") {
      if (!user_id) throw new Error("user_id required");

      const { data: assignments, error: assignError } = await serviceClient
        .from("assignments")
        .select("id, title, status, word_count, target_grade, assignment_type, created_at, updated_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (assignError) throw new Error(assignError.message);

      return new Response(
        JSON.stringify({ assignments: assignments || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "award_feedback_credits") {
      if (!user_id) throw new Error("user_id required");

      // Mark latest unawarded feedback as credited
      const { data: fb } = await serviceClient
        .from("feedback")
        .select("id")
        .eq("user_id", user_id)
        .eq("credits_awarded", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fb && fb.length > 0) {
        await serviceClient.from("feedback").update({ credits_awarded: true }).eq("id", fb[0].id);
        await serviceClient.rpc("restore_credits", { p_user_id: user_id, p_amount: 100 });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "get_feedback") {
      const { data: feedbackRows, error: fbError } = await serviceClient
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (fbError) throw new Error(fbError.message);

      // Get profile info for each unique user
      const userIds = [...new Set((feedbackRows || []).map((f: any) => f.user_id))];
      const { data: profileRows } = await serviceClient
        .from("profiles")
        .select("user_id, full_name, university")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profileRows || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const enriched = (feedbackRows || []).map((f: any) => ({
        ...f,
        full_name: profileMap[f.user_id]?.full_name || "—",
        university: profileMap[f.user_id]?.university || "—",
      }));

      return new Response(
        JSON.stringify({ feedback: enriched }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "delete_assignment") {
      if (!assignment_id) throw new Error("assignment_id required");

      const { error: delError } = await serviceClient
        .from("assignments")
        .delete()
        .eq("id", assignment_id);

      if (delError) throw new Error(delError.message);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
