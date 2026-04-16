import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-accent" />
            <span className="font-bold text-primary">MyUniPal</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link>
          </Button>
        </div>
      </header>
      <main className="container max-w-3xl py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>
        <article className="prose prose-slate max-w-none [&_h2]:text-primary [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-primary [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2 [&_li]:text-foreground [&_a]:text-accent [&_a]:underline [&_strong]:text-primary">
          {children}
        </article>
        <footer className="mt-16 pt-8 border-t text-sm text-muted-foreground flex flex-wrap gap-4 justify-center">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/refund" className="hover:text-foreground">Refund Policy</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/acceptable-use" className="hover:text-foreground">Acceptable Use</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </footer>
      </main>
    </div>
  );
};

export default LegalLayout;
