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

    // Verify admin
    if (!ADMIN_EMAILS.includes(userData.user.email || "")) {
      throw new Error("Unauthorized — admin access only");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, user_id, amount } = await req.json();

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

      // Get current balance
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

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
