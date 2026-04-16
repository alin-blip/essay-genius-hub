import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "myunipal_cookie_consent_v1";

type Choice = "accepted" | "rejected";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Defer to avoid layout flash
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (choice: Choice) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, timestamp: new Date().toISOString() })
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 bg-background border-2 border-border rounded-xl shadow-2xl p-5 animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
          <Cookie className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary mb-1">We use cookies</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Strictly necessary cookies keep you logged in. With your permission we'd also like to use
            optional analytics to understand usage. Read our{" "}
            <Link to="/cookies" className="text-accent underline hover:no-underline">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => decide("accepted")}
            >
              Accept all
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("rejected")}>
              Reject non-essential
            </Button>
          </div>
        </div>
        <button
          onClick={() => decide("rejected")}
          aria-label="Close and reject non-essential cookies"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
