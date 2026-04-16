import LegalLayout from "@/components/legal/LegalLayout";
import { Mail, MapPin, Building2 } from "lucide-react";

const Contact = () => (
  <LegalLayout title="Contact Us" lastUpdated="16 April 2026">
    <p>We're a small UK team and we read every message. The fastest way to reach us is by email — we usually respond within one working day.</p>

    <div className="not-prose grid gap-4 my-8">
      <div className="flex items-start gap-3 p-4 border rounded-lg bg-secondary/30">
        <Mail className="h-5 w-5 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Email support</p>
          <a href="mailto:support@myunipal.io" className="text-accent hover:underline">support@myunipal.io</a>
          <p className="text-sm text-muted-foreground mt-1">Account, billing, refunds, technical issues, GDPR requests.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 border rounded-lg bg-secondary/30">
        <Building2 className="h-5 w-5 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Company</p>
          <p className="text-foreground"><strong>[COMPANY NAME] Ltd</strong></p>
          <p className="text-sm text-muted-foreground">Registered in England and Wales · Company no. <strong>[NUMBER]</strong></p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 border rounded-lg bg-secondary/30">
        <MapPin className="h-5 w-5 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Registered office</p>
          <p className="text-foreground whitespace-pre-line"><strong>[REGISTERED ADDRESS]</strong></p>
        </div>
      </div>
    </div>

    <h2>Other useful links</h2>
    <ul>
      <li><a href="/privacy">Privacy Policy</a></li>
      <li><a href="/terms">Terms of Service</a></li>
      <li><a href="/refund">Refund Policy</a></li>
      <li><a href="/cookies">Cookie Policy</a></li>
      <li><a href="/acceptable-use">Acceptable Use Policy</a></li>
    </ul>

    <h2>Press / business enquiries</h2>
    <p>For partnership, university, press or affiliate enquiries, please email <a href="mailto:support@myunipal.io">support@myunipal.io</a> with subject line "Business — [topic]".</p>

    <h2>Reporting abuse</h2>
    <p>If you believe MyUniPal output is being misused — for example by an essay-mill or to commit fraud — please report it to <a href="mailto:support@myunipal.io">support@myunipal.io</a>. We investigate every report.</p>
  </LegalLayout>
);

export default Contact;
