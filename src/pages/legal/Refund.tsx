import LegalLayout from "@/components/legal/LegalLayout";
import Seo from "@/components/Seo";

const Refund = () => (
  <LegalLayout title="Refund Policy" lastUpdated="16 April 2026">
    <Seo
      title="Refund Policy — MyUniPal"
      description="MyUniPal refund policy: digital content waiver, subscription cancellations, refund eligibility and how to request a refund."
      path="/refund"
    />
    <h2>1. Digital content waiver — please read</h2>
    <p>MyUniPal delivers <strong>digital content that is supplied immediately</strong>. Under regulation 37 of the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, when you click <strong>"Generate"</strong> you:</p>
    <ul>
      <li>Give your <strong>express consent</strong> to immediate performance of the contract; and</li>
      <li>Acknowledge that you <strong>lose your 14-day cancellation right</strong> in respect of that generation.</li>
    </ul>
    <p>Therefore, generations that have been successfully delivered are <strong>non-refundable</strong>.</p>

    <h2>2. Subscriptions</h2>
    <p>Plan fees pay for access plus a monthly credit allowance. You can cancel a subscription at any time via Settings → Billing Portal. Cancellation stops future renewals; the current billing period remains active until its end and is non-refundable once any credits from that period have been used.</p>

    <h2>3. When we WILL refund</h2>
    <p>We will issue a full or partial refund (or credit your account) where:</p>
    <ul>
      <li><strong>Failed generation:</strong> if a generation fails for technical reasons on our side, credits are restored automatically. If you were charged for a plan and zero credits were ever used, contact us within 14 days for a full refund.</li>
      <li><strong>Duplicate or accidental charge.</strong></li>
      <li><strong>Service materially unavailable</strong> for an extended period due to our fault.</li>
      <li><strong>Required by law</strong> in your jurisdiction.</li>
    </ul>

    <h2>4. When we WILL NOT refund</h2>
    <ul>
      <li>Generations you don't like, didn't expect or weren't satisfied with — please use the regeneration / humanisation features instead, or contact support for help improving prompts.</li>
      <li>Generations that resulted in a poor grade or academic-misconduct finding (you remain responsible — see our <a href="/terms">Terms</a> and <a href="/acceptable-use">Acceptable Use Policy</a>).</li>
      <li>Plans where credits have been partially used.</li>
      <li>Cancellations after the renewal date in the current period.</li>
    </ul>

    <h2>5. How to request a refund</h2>
    <p>Email <a href="mailto:support@myunipal.io">support@myunipal.io</a> from the email on your account, with your transaction reference and a brief description. We respond within 5 working days. Approved refunds are returned to your original payment method within 5–10 working days.</p>

    <h2>6. Chargebacks</h2>
    <p>Please contact us before raising a chargeback with your bank — most issues can be resolved more quickly directly. Disputed chargebacks may result in account suspension while we investigate.</p>

    <h2>7. Statutory rights</h2>
    <p>This policy does not affect your statutory rights under the Consumer Rights Act 2015, including the right to a refund where a digital service is not of satisfactory quality, fit for purpose or as described.</p>
  </LegalLayout>
);

export default Refund;
