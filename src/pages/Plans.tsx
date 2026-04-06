import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, ArrowLeft, Check, Crown, Sparkles, Loader2, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TIERS, MANAGER_ADDONS, getStudentTiers, getAgentTiers,
  type TierConfig, type ManagerAddonConfig,
} from "@/lib/subscription-tiers";

const Plans = () => {
  const { subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<"student" | "agent">("student");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const tiers = category === "student" ? getStudentTiers() : getAgentTiers();
  const currentProductId = subscription.planTier?.productId;

  const handleCheckout = async (priceId: string, tierId: string) => {
    setCheckoutLoading(tierId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    }
  };

  const isCurrentPlan = (tier: TierConfig) => tier.productId === currentProductId;

  const getButtonLabel = (tier: TierConfig) => {
    if (isCurrentPlan(tier)) return "Current Plan";
    if (!subscription.subscribed) return "Subscribe";
    // Compare price to determine upgrade vs downgrade
    const currentPrice = subscription.planTier?.priceGBP ?? 0;
    return tier.priceGBP > currentPrice ? "Upgrade" : "Switch";
  };

  return (
    <div className="min-h-screen bg-secondary/20">
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-accent" />
            <span className="text-lg font-bold text-primary">AssignmentPro</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
          </Button>
        </div>
      </nav>

      <div className="container py-8 max-w-6xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {subscription.subscribed
              ? `You're on the ${subscription.planTier?.name || "active"} plan. Upgrade or manage your subscription below.`
              : "Select a plan to unlock unlimited AI-powered assignments."}
          </p>
        </div>

        {/* Category Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={category === "student" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCategory("student")}
              className={category === "student" ? "bg-accent text-accent-foreground" : ""}
            >
              Student Plans
            </Button>
            <Button
              variant={category === "agent" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCategory("agent")}
              className={category === "agent" ? "bg-accent text-accent-foreground" : ""}
            >
              Agent Plans
            </Button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const current = isCurrentPlan(tier);
            return (
              <Card
                key={tier.productId}
                className={`relative transition-all ${
                  current
                    ? "border-accent shadow-lg ring-2 ring-accent/20"
                    : tier.highlighted
                    ? "border-accent/50 shadow-md"
                    : "border"
                }`}
              >
                {current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground gap-1">
                      <Crown className="h-3 w-3" /> Your Plan
                    </Badge>
                  </div>
                )}
                {!current && tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 pt-8 space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-primary">£{tier.priceGBP}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tier.assignmentsPerMonth
                        ? `${tier.assignmentsPerMonth} assignments · ${(tier.wordsPerMonth ?? 0).toLocaleString()} words`
                        : "Unlimited assignments & words"}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {current ? (
                    <Button variant="outline" className="w-full" onClick={handlePortal}>
                      <ExternalLink className="h-4 w-4 mr-1" /> Manage Billing
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        tier.highlighted
                          ? "bg-accent text-accent-foreground hover:bg-accent/90"
                          : ""
                      }`}
                      variant={tier.highlighted ? "default" : "outline"}
                      disabled={checkoutLoading === tier.productId}
                      onClick={() => {
                        if (subscription.subscribed) {
                          // For plan changes, go to Stripe portal
                          handlePortal();
                        } else {
                          handleCheckout(tier.priceId, tier.productId);
                        }
                      }}
                    >
                      {checkoutLoading === tier.productId ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : null}
                      {getButtonLabel(tier)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Manager Add-ons */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Assignment Manager Add-on
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {subscription.hasManagerAddon
                ? `Your ${subscription.managerTier?.replace("_", " ")} manager is active ✨`
                : "Let a real person handle your assignments — generation to upload."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {MANAGER_ADDONS.map((addon) => {
              const isActive = subscription.hasManagerAddon && subscription.managerTier === addon.key;
              return (
                <Card
                  key={addon.key}
                  className={`relative ${
                    isActive
                      ? "border-accent shadow-lg ring-2 ring-accent/20"
                      : addon.highlighted
                      ? "border-accent/50 shadow-md"
                      : "border"
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground gap-1">
                        <Check className="h-3 w-3" /> Active
                      </Badge>
                    </div>
                  )}
                  {!isActive && addon.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">Best Value</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 pt-8 space-y-4">
                    <div>
                      <h3 className="font-bold text-foreground">{addon.name}</h3>
                      <div className="mt-1">
                        <span className="text-2xl font-bold text-primary">£{addon.priceGBP}</span>
                        <span className="text-sm text-muted-foreground">{addon.billing}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{addon.description}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {addon.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                          <span className="text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isActive ? (
                      <Button variant="outline" className="w-full" size="sm" onClick={handlePortal}>
                        Manage
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className={`w-full ${addon.highlighted ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                        variant={addon.highlighted ? "default" : "outline"}
                        disabled={!!checkoutLoading}
                        onClick={() => handleCheckout(addon.priceId, addon.key)}
                      >
                        {checkoutLoading === addon.key ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : null}
                        {subscription.hasManagerAddon ? "Switch" : "Add Manager"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Billing management for subscribed users */}
        {subscription.subscribed && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Need to update payment method, cancel, or view invoices?
            </p>
            <Button variant="outline" onClick={handlePortal}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open Billing Portal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
