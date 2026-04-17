import LegalLayout from "@/components/legal/LegalLayout";
import Seo from "@/components/Seo";

const Cookies = () => (
  <LegalLayout title="Cookie Policy" lastUpdated="16 April 2026">
    <Seo
      title="Cookie Policy — MyUniPal"
      description="How MyUniPal uses cookies and similar technologies, the categories we use and how to manage your preferences."
      path="/cookies"
    />
    <p>This Cookie Policy explains how MyUniPal uses cookies and similar technologies. It should be read alongside our <a href="/privacy">Privacy Policy</a>.</p>

    <h2>1. What are cookies?</h2>
    <p>Cookies are small text files placed on your device when you visit a website. They allow the site to remember your actions and preferences (such as login session, language) over a period of time.</p>

    <h2>2. Cookies we use</h2>
    <h3>Strictly necessary (always on)</h3>
    <ul>
      <li><strong>Authentication tokens</strong> (Supabase) — to keep you logged in.</li>
      <li><strong>CSRF / security cookies</strong> — to protect against cross-site attacks.</li>
      <li><strong>Consent preference</strong> — to remember your cookie choice.</li>
    </ul>
    <p>These cookies are essential for the service to function and do not require consent under PECR.</p>

    <h3>Functional (with consent)</h3>
    <ul>
      <li>Remember UI preferences, sidebar state, theme.</li>
    </ul>

    <h3>Analytics (with consent)</h3>
    <ul>
      <li>Aggregated, privacy-friendly usage analytics to help us improve the service. No cross-site tracking, no advertising profiles.</li>
    </ul>

    <h3>Marketing</h3>
    <p>We do <strong>not</strong> currently use marketing or advertising cookies.</p>

    <h2>3. Managing your choices</h2>
    <p>When you first visit the site you'll see a banner letting you accept or reject non-essential cookies. You can change your choice at any time by clearing your browser cookies for our site, which will trigger the banner again. You can also block or delete cookies in your browser settings — note that strictly necessary cookies cannot be disabled without breaking the service.</p>

    <h2>4. Third-party cookies</h2>
    <p>Stripe sets cookies on its own checkout / billing portal pages for fraud prevention. These are governed by Stripe's privacy policy.</p>

    <h2>5. Contact</h2>
    <p>Questions about cookies? Email <a href="mailto:support@myunipal.io">support@myunipal.io</a>.</p>
  </LegalLayout>
);

export default Cookies;
