import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { affiliate_id } = await req.json();
    if (!affiliate_id) throw new Error("affiliate_id required");

    // Verify affiliate belongs to user and is approved
    const { data: affiliate, error: affError } = await supabaseClient
      .from("affiliates")
      .select("*")
      .eq("id", affiliate_id)
      .eq("user_id", userData.user.id)
      .single();
    if (affError || !affiliate) throw new Error("Affiliate not found");
    if (affiliate.status !== "approved") throw new Error("Affiliate not approved");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    let accountId = affiliate.stripe_connect_account_id;

    if (!accountId) {
      // Create Express account
      const account = await stripe.accounts.create({
        type: "express",
        email: userData.user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          affiliate_id: affiliate.id,
          user_id: userData.user.id,
        },
      });
      accountId = account.id;

      // Save to DB
      await supabaseClient
        .from("affiliates")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", affiliate.id);
    }

    // Create onboarding link
    const origin = req.headers.get("origin") || "https://essay-genius-hub.lovable.app";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/affiliate/dashboard`,
      return_url: `${origin}/affiliate/dashboard`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[affiliate-connect] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
