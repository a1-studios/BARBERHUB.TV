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
