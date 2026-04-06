import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MANAGER_PRODUCT_IDS: Record<string, string> = {
  "prod_UHinoHKxoNq82E": "monthly",
  "prod_UHitFVNwfJgmvv": "academic_year",
  "prod_UHitoIAkNJKLoL": "final_year",
};

const TIER_CREDITS: Record<string, number> = {
  prod_UHinD1B3zVPt72: 6000,    // Student Basic
  prod_UHin9GTCwtWlRV: 14000,   // Student Plus
  prod_UHinvCKRWyHyHi: 30000,   // Student Pro
  prod_UHin4osqm95O10: 20000,   // Agent Starter
  prod_UHinm0SYSKUfiv: 40000,   // Agent Pro
  prod_UHinZVw3tUxMm8: 999999,  // Agent Unlimited
};

const TIER_CATEGORY: Record<string, string> = {
  prod_UHinD1B3zVPt72: "student",
  prod_UHin9GTCwtWlRV: "student",
  prod_UHinvCKRWyHyHi: "student",
  prod_UHin4osqm95O10: "agent",
  prod_UHinm0SYSKUfiv: "agent",
  prod_UHinZVw3tUxMm8: "agent",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let planProductId: string | null = null;
    let subscriptionEnd: string | null = null;
    let hasManagerAddon = false;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const prodId = typeof item.price.product === "string" ? item.price.product : (item.price.product as any).id;
        if (prodId === MANAGER_PRODUCT_ID) {
          hasManagerAddon = true;
        } else if (TIER_CREDITS[prodId] !== undefined) {
          planProductId = prodId;
          subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
      }
    }

    if (planProductId) {
      const credits = TIER_CREDITS[planProductId] || 0;
      const category = TIER_CATEGORY[planProductId] || "student";
      logStep("Updating profile", { planProductId, credits, category, hasManagerAddon });

      await supabaseClient.from("profiles").update({
        credits_balance: credits,
        subscription_plan: planProductId,
        account_type: category,
        has_manager_addon: hasManagerAddon,
      }).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: !!planProductId,
      product_id: planProductId,
      subscription_end: subscriptionEnd,
      has_manager_addon: hasManagerAddon,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
