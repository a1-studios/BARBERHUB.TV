import { LegalLayout } from '@/components/legal/LegalLayout';

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2><span className="num">{n}.</span> {title}</h2>
    {children}
  </section>
);

const Privacy = () => (
  <LegalLayout title="Privacy Policy">
    <Section n="1" title="Who We Are">
      <p>Barber Hub LLC, 175 East Shore Road, Great Neck, NY. Contact: <a href="mailto:PRIVACY@BARBERHUB.TV">PRIVACY@BARBERHUB.TV</a>.</p>
    </Section>

    <Section n="2" title="Data Collected">
      <ul>
        <li>Account details</li>
        <li>Stripe payment data (no raw card data stored)</li>
        <li>Uploaded media</li>
        <li>Device IP</li>
        <li>Analytics</li>
      </ul>
    </Section>

    <Section n="2a" title="SMS Consent and Phone Numbers">
      <p>
        When you provide a mobile phone number for sign-up, login, or account recovery, you opt in to receive
        one-time SMS verification codes ("OTPs") and security-related transactional messages from Barber-Hub.
      </p>
      <p>
        <strong>
          No mobile information will be shared with third parties/affiliates for marketing/promotional purposes.
          All other use-case categories exclude text messaging originator opt-in data and consent; this information
          will not be shared with any third parties under any circumstances.
        </strong>
      </p>
      <p>
        Phone numbers are stored encrypted at rest and used solely for authentication, account security, and (where
        you have separately opted in) booking notifications. You may remove your phone number at any time from your
        account settings, which will disable SMS-based login on that number.
      </p>
    </Section>


    <Section n="3" title="How We Share Data">
      <p>We do not sell data. We share strictly with processors:</p>
      <ul>
        <li><strong>Stripe</strong> (payments)</li>
        <li><strong>Supabase</strong> (auth)</li>
        <li><strong>LiveKit</strong> (streaming)</li>
        <li><strong>Google/Gemini</strong> (AI)</li>
      </ul>
      <p>We do not use private user content to train AI foundation models without explicit opt-in.</p>
    </Section>

    <Section n="4" title="User Rights">
      <ul>
        <li><strong>EU/UK (GDPR)</strong> users can access, correct, or delete data.</li>
        <li><strong>CA (CCPA)</strong> users can request deletion and know what is collected.</li>
      </ul>
    </Section>

    <Section n="5" title="Retention">
      <p>Deleted accounts will have their media content purged from our servers within <strong>30 days</strong>.</p>
    </Section>
  </LegalLayout>
);

export default Privacy;
