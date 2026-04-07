import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify webhook signature if STRIPE_WEBHOOK_SECRET is set
    const body = await req.text();
    let event: Stripe.Event;
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type !== "invoice.payment_succeeded") {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.customer_email) {
      console.log("[affiliate-webhook] No customer email on invoice");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Find user by email
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData?.users?.find((u) => u.email === invoice.customer_email);
    if (!user) {
      console.log("[affiliate-webhook] No user found for", invoice.customer_email);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Check if this user was referred
    const { data: referral } = await supabase
      .from("referrals")
      .select("*, affiliates(*)")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (!referral) {
      console.log("[affiliate-webhook] User not referred");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const affiliate = (referral as any).affiliates;
    if (!affiliate || affiliate.status !== "approved" || !affiliate.stripe_connect_account_id) {
      console.log("[affiliate-webhook] Affiliate not ready for payouts");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Update referral status to subscribed
    if (referral.status === "signed_up") {
      await supabase
        .from("referrals")
        .update({ status: "subscribed" })
        .eq("id", referral.id);
    }

    // Calculate 30% commission
    const amountPaid = invoice.amount_paid; // in pence/cents
    const commission = Math.floor(amountPaid * affiliate.commission_rate);

    if (commission <= 0) {
      console.log("[affiliate-webhook] Commission is 0, skipping");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Create Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: commission,
      currency: invoice.currency || "gbp",
      destination: affiliate.stripe_connect_account_id,
      description: `Commission for referral ${referral.id}`,
      metadata: {
        affiliate_id: affiliate.id,
        referral_id: referral.id,
        invoice_id: invoice.id,
      },
    });

    // Log payout
    await supabase.from("affiliate_payouts").insert({
      affiliate_id: affiliate.id,
      referral_id: referral.id,
      stripe_transfer_id: transfer.id,
      amount_pence: commission,
      currency: invoice.currency || "gbp",
      status: "completed",
    });

    // Send email notification to affiliate
    const affiliateEmail = affiliate.contact_email;
    if (affiliateEmail) {
      const commissionFormatted = (commission / 100).toFixed(2);
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "referral-upgraded",
            recipientEmail: affiliateEmail,
            idempotencyKey: `referral-upgraded-${referral.id}-${invoice.id}`,
            templateData: {
              affiliateName: affiliate.contact_name || undefined,
              referralEmail: invoice.customer_email,
              commissionAmount: commissionFormatted,
            },
          },
        });
        console.log(`[affiliate-webhook] Notification email queued for ${affiliateEmail}`);
      } catch (emailErr) {
        console.error("[affiliate-webhook] Failed to queue notification email:", emailErr);
      }
    }

    console.log(`[affiliate-webhook] Paid ${commission} to affiliate ${affiliate.id}`);
    return new Response(JSON.stringify({ received: true, commission }), { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[affiliate-webhook] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
