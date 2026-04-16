import LegalLayout from "@/components/legal/LegalLayout";

const Privacy = () => (
  <LegalLayout title="Privacy Policy" lastUpdated="16 April 2026">
    <p>This Privacy Policy explains how <strong>[COMPANY NAME] Ltd</strong> ("we", "us", "MyUniPal") collects, uses and protects your personal data when you use our service at myunipal.io and unitaskpro.org. We are the data controller for the purposes of the UK GDPR and Data Protection Act 2018.</p>

    <h2>1. Who we are</h2>
    <p>MyUniPal is operated by <strong>[COMPANY NAME] Ltd</strong>, a company registered in England and Wales (company number <strong>[NUMBER]</strong>) with registered office at <strong>[REGISTERED ADDRESS]</strong>. For any privacy enquiries contact us at <a href="mailto:support@myunipal.io">support@myunipal.io</a>.</p>

    <h2>2. What data we collect</h2>
    <ul>
      <li><strong>Account data:</strong> name, email address, password (hashed), university, course, academic level.</li>
      <li><strong>Usage data:</strong> assignments generated, prompts you submit, credits balance, generation logs.</li>
      <li><strong>Payment data:</strong> handled by Stripe — we never see or store full card details. We retain billing email, plan, transaction reference and invoice history.</li>
      <li><strong>Technical data:</strong> IP address, browser type, device, log files, timestamps (used for security and abuse prevention).</li>
      <li><strong>Cookies:</strong> see our <a href="/cookies">Cookie Policy</a>.</li>
    </ul>

    <h2>3. Why we use it (lawful basis)</h2>
    <ul>
      <li><strong>Contract (Art. 6(1)(b) UK GDPR):</strong> to provide the service you signed up for — generation, storage, exports, billing.</li>
      <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> service security, fraud and abuse prevention, product improvement, basic analytics.</li>
      <li><strong>Legal obligation (Art. 6(1)(c)):</strong> tax records, responding to lawful requests.</li>
      <li><strong>Consent (Art. 6(1)(a)):</strong> non-essential cookies, marketing emails (where applicable). You can withdraw consent at any time.</li>
    </ul>

    <h2>4. Sub-processors we share data with</h2>
    <p>We only share data with vetted providers strictly necessary to run the service:</p>
    <ul>
      <li><strong>Supabase</strong> (database & auth) — EU region.</li>
      <li><strong>Stripe</strong> (payments) — UK/EU.</li>
      <li><strong>Lovable AI Gateway / OpenAI / Google</strong> (text generation) — your prompts are sent to large language model providers to generate content.</li>
      <li><strong>Undetectable.ai</strong> (humanisation) and <strong>GPTZero</strong> (AI detection scoring), where you use those features.</li>
      <li><strong>OpenAlex</strong> (academic reference lookup).</li>
      <li><strong>Resend</strong> (transactional email).</li>
    </ul>
    <p>We never sell your personal data.</p>

    <h2>5. International transfers</h2>
    <p>Some processors are based in the United States. Where data leaves the UK/EEA we rely on the UK International Data Transfer Addendum or the EU Standard Contractual Clauses to ensure equivalent protection.</p>

    <h2>6. How long we keep data</h2>
    <ul>
      <li>Account & assignments: while your account is active, plus 30 days after deletion (for backups).</li>
      <li>Billing records: 6 years (UK tax law).</li>
      <li>Server logs: up to 90 days.</li>
    </ul>

    <h2>7. Your rights</h2>
    <p>Under UK GDPR you have the right to: access, rectify, erase ("right to be forgotten"), restrict processing, portability, object, and withdraw consent. You can exercise these rights at any time:</p>
    <ul>
      <li><strong>Export your data:</strong> Settings → "Export my data".</li>
      <li><strong>Delete your account:</strong> Settings → "Delete my account".</li>
      <li><strong>Other requests:</strong> email <a href="mailto:support@myunipal.io">support@myunipal.io</a> — we'll respond within 30 days.</li>
    </ul>
    <p>You also have the right to lodge a complaint with the UK Information Commissioner's Office (<a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>).</p>

    <h2>8. Security</h2>
    <p>Data is encrypted in transit (TLS) and at rest. Passwords are hashed. Access to production systems is restricted and logged. We use Row Level Security on our database to ensure you only access your own data.</p>

    <h2>9. Children</h2>
    <p>MyUniPal is intended for users aged 18 and over. We do not knowingly process data of children under 16. If you believe a child has signed up, contact us and we will delete the account.</p>

    <h2>10. Changes</h2>
    <p>We will notify you by email of material changes. Continued use after the effective date constitutes acceptance.</p>
  </LegalLayout>
);

export default Privacy;
