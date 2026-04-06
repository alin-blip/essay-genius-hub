import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CheckCircle, Users, GraduationCap, Sparkles, Crown } from "lucide-react";
import { getStudentTiers, getAgentTiers, MANAGER_ADDONS, type TierConfig } from "@/lib/subscription-tiers";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

function PlanCard({ tier }: { tier: TierConfig }) {
  return (
    <Card className={`relative overflow-hidden h-full ${tier.highlighted ? "border-accent shadow-lg scale-105" : "border shadow-sm"}`}>
      {tier.highlighted && (
        <div className="absolute top-0 left-0 right-0 bg-accent text-accent-foreground text-center text-xs font-semibold py-1.5">
          MOST POPULAR
        </div>
      )}
      <CardContent className={`p-6 space-y-6 ${tier.highlighted ? "pt-10" : ""}`}>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
          <p className="text-sm text-muted-foreground">
            {tier.assignmentsPerMonth ? `${tier.assignmentsPerMonth} assignments/month` : "Unlimited assignments"}
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-primary">£{tier.priceGBP}</span>
          <span className="text-muted-foreground text-sm">/month</span>
        </div>
        <ul className="space-y-2.5">
          {tier.features.map((f, j) => (
            <li key={j} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <Button
          className={`w-full ${tier.highlighted ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
          variant={tier.highlighted ? "default" : "outline"}
          asChild
        >
          <Link to="/signup">Get Started</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PricingSection() {
  const [category, setCategory] = useState<"student" | "agent">("student");
  const studentTiers = getStudentTiers();
  const agentTiers = getAgentTiers();
  const tiers = category === "student" ? studentTiers : agentTiers;

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container">
        <RevealSection>
          <div className="text-center mb-10 space-y-4">
            <p className="text-accent font-semibold text-sm uppercase tracking-wider">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Choose the plan that fits your needs.</p>
          </div>
        </RevealSection>

        {/* Category Toggle */}
        <RevealSection>
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
              <button
                onClick={() => setCategory("student")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                  category === "student"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Students
              </button>
              <button
                onClick={() => setCategory("agent")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                  category === "agent"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Writers & Agents
              </button>
            </div>
          </div>
        </RevealSection>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier) => (
            <RevealSection key={tier.productId}>
              <PlanCard tier={tier} />
            </RevealSection>
          ))}
        </div>

        {/* Manager Add-on */}
        <RevealSection>
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{MANAGER_ADDON.name}</h3>
                    <Badge variant="secondary" className="text-xs">Add-on</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{MANAGER_ADDON.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-primary">£{MANAGER_ADDON.priceGBP}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
