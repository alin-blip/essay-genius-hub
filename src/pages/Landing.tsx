import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  BookOpen,
  Shield,
  Award,
  FileText,
  CheckCircle,
  Star,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SocialProofStats from "@/components/landing/SocialProofStats";
import Testimonials from "@/components/landing/Testimonials";
import UniversityLogos from "@/components/landing/UniversityLogos";

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

const features = [
  {
    icon: BookOpen,
    title: "Harvard & APA Referencing",
    description: "Automatic citation formatting with real academic sources. Harvard, APA, OSCOLA — perfectly structured.",
  },
  {
    icon: Shield,
    title: "Advanced Humanization",
    description: "Built-in paraphrasing engine ensures natural, human-like writing that passes all detection tools.",
  },
  {
    icon: Award,
    title: "Pass to Distinction",
    description: "Choose your target grade — from Pass (40%) to First Class (70%+). AI adjusts complexity accordingly.",
  },
  {
    icon: FileText,
    title: "All Assignment Types",
    description: "Essays, reports, case studies, reflective accounts, research projects, and full dissertations.",
  },
  {
    icon: GraduationCap,
    title: "UK University Standards",
    description: "Tailored to HND Level 5, BSc Level 6, and MSc Level 7 academic requirements.",
  },
  {
    icon: Star,
    title: "Export Ready",
    description: "Download as DOCX or PDF with proper formatting — Arial 12pt, 1.5 spacing, cover pages.",
  },
];

const steps = [
  { step: "01", title: "Paste Your Brief", description: "Enter your module name, assignment title, and paste the assignment brief from your university." },
  { step: "02", title: "Set Your Requirements", description: "Choose your target grade, word count, referencing style, and any specific instructions." },
  { step: "03", title: "Get Your Assignment", description: "AI generates your work with proper structure, references, and human-like writing quality." },
];

// Plans are now in src/lib/subscription-tiers.ts

const faqs = [
  { q: "Will my assignment be detected as AI-generated?", a: "Our advanced humanization engine rewrites content with natural sentence variation, academic hedging phrases, and varied vocabulary. The output reads like genuine student writing." },
  { q: "Which UK universities do you support?", a: "We support all UK universities and courses. Our system adapts to the specific grading criteria and academic standards of your institution." },
  { q: "What referencing styles are available?", a: "We support Harvard, APA, OSCOLA, Vancouver, and Chicago referencing styles with properly formatted in-text citations and reference lists." },
  { q: "Can I edit the generated assignment?", a: "Yes! Our built-in editor lets you modify any section, regenerate specific parts, and fine-tune the content before exporting." },
  { q: "How does the grading system work?", a: "Select your target grade (Pass, Merit, Distinction, or First Class) and our AI adjusts the writing complexity, critical analysis depth, and argumentation quality accordingly." },
  { q: "Do you support dissertations?", a: "Yes! Our Dissertation plan includes a chapter-by-chapter builder covering introduction, literature review, methodology, findings, discussion, and conclusion." },
];

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#testimonials", label: "Reviews" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-accent" />
            <span className="text-xl font-bold text-primary">AssignmentPro</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background animate-fade-in">
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button variant="ghost" asChild>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                </Button>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              <Star className="h-3.5 w-3.5 mr-1.5 text-accent" />
              Trusted by 7,000+ UK students
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
              Get Your UK University{" "}
              <span className="text-accent">Assignments</span>{" "}
              Done Right
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered academic writing tailored to UK university standards.
              From essays to dissertations — choose your grade level, paste your brief,
              and get publication-ready work in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8">
                <Link to="/signup">
                  Start Your Assignment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base px-8">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Harvard Referencing
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Anti-AI Detection
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                All UK Universities
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* University Logos */}
      <UniversityLogos />

      {/* Social Proof Stats */}
      <SocialProofStats />

      {/* Features */}
      <section id="features" className="py-20 md:py-28 bg-secondary/30">
        <div className="container">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <p className="text-accent font-semibold text-sm uppercase tracking-wider">Features</p>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">
                Everything You Need to Succeed
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built specifically for UK university standards, covering every course and level.
              </p>
            </div>
          </RevealSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <RevealSection key={i}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card h-full">
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <p className="text-accent font-semibold text-sm uppercase tracking-wider">How It Works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Three Simple Steps</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From brief to finished assignment in minutes, not days.
              </p>
            </div>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((item, i) => (
              <RevealSection key={i}>
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <div id="testimonials">
        <Testimonials />
      </div>

      {/* Pricing */}
      <PricingSection />

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 bg-secondary/30">
        <div className="container max-w-3xl">
          <RevealSection>
            <div className="text-center mb-16 space-y-4">
              <p className="text-accent font-semibold text-sm uppercase tracking-wider">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Frequently Asked Questions</h2>
            </div>
          </RevealSection>
          <RevealSection>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </RevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="container text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Ready to Ace Your Assignments?
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Join 7,000+ students already using AssignmentPro. Start with 5,000 free words.
          </p>
          <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-10">
            <Link to="/signup">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-accent" />
            <span className="font-bold text-primary">AssignmentPro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AssignmentPro. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
