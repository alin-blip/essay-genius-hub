import LegalLayout from "@/components/legal/LegalLayout";

const AcceptableUse = () => (
  <LegalLayout title="Acceptable Use Policy" lastUpdated="16 April 2026">
    <p>This Acceptable Use Policy ("AUP") forms part of our <a href="/terms">Terms of Service</a>. Breach of this AUP may lead to immediate suspension or termination of your account without refund.</p>

    <h2>1. Academic integrity (the most important section)</h2>
    <p>MyUniPal is a <strong>study, research and drafting aid</strong>. It is <strong>not</strong> a service for producing work to be submitted as your own without disclosure or substantial editing.</p>
    <p>Most UK universities have explicit policies on the use of generative AI. Many require disclosure; some prohibit AI-assisted writing for certain assessments. <strong>It is your responsibility to:</strong></p>
    <ul>
      <li>Read and follow your institution's policy on AI assistance for each assessment.</li>
      <li>Disclose your use of AI tools where required.</li>
      <li>Substantially review, edit and personalise any output before submission.</li>
      <li>Independently verify all facts, statistics and references — AI can hallucinate.</li>
    </ul>
    <p>By using MyUniPal you confirm that you understand these responsibilities and accept that the consequences of any academic misconduct finding rest with you.</p>

    <h2>2. Prohibited uses</h2>
    <p>You must not use MyUniPal to:</p>
    <ul>
      <li>Produce content for resale as a ghostwriting or essay-mill service to third parties;</li>
      <li>Generate content that is unlawful, defamatory, harassing, threatening, hateful, sexually exploitative, or that infringes intellectual property rights;</li>
      <li>Produce material designed to deceive, defraud or impersonate another person or institution;</li>
      <li>Generate content related to weapons, terrorism, child sexual abuse material, or other content prohibited by UK law;</li>
      <li>Submit prompts containing personal data of others without lawful basis;</li>
      <li>Attempt to bypass safety filters, prompt-inject, or extract system prompts;</li>
      <li>Reverse-engineer, scrape or otherwise extract our prompts, model behaviour or proprietary methodology;</li>
      <li>Share account credentials or resell access;</li>
      <li>Circumvent rate limits, credit limits, or fraudulently obtain free credits.</li>
    </ul>

    <h2>3. Output review obligation</h2>
    <p>You agree that you will:</p>
    <ul>
      <li>Treat all output as a <strong>draft requiring your editing and verification</strong>;</li>
      <li>Not rely on AI-generated references without checking that the source actually exists and says what is claimed;</li>
      <li>Not present AI-generated work as your own original creation in any context where authorship is material.</li>
    </ul>

    <h2>4. Reporting abuse</h2>
    <p>If you believe someone is misusing MyUniPal, email <a href="mailto:support@myunipal.io">support@myunipal.io</a> with details. We investigate every report.</p>

    <h2>5. Enforcement</h2>
    <p>We may at our discretion: warn the user, suspend the account, terminate the account without refund, or report to relevant authorities. We log generation activity for the purposes of detecting abuse.</p>
  </LegalLayout>
);

export default AcceptableUse;
