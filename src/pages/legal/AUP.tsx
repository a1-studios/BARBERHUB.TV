import { LegalLayout } from '@/components/legal/LegalLayout';

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2><span className="num">{n}.</span> {title}</h2>
    {children}
  </section>
);

const AUP = () => (
  <LegalLayout title="Acceptable Use Policy">
    <Section n="1" title="Prohibited Conduct">
      <p>No illegal activity, fraud, or harassment.</p>
    </Section>

    <Section n="2" title="Competition Integrity">
      <ul>
        <li>Do not create fake accounts to manipulate votes.</li>
        <li>Do not use bots or scripts.</li>
        <li>Do not attempt to bribe judges.</li>
      </ul>
      <p>Violation results in <strong>permanent bans</strong> and forfeiture of the <strong>$25,000 prize pool</strong> eligibility.</p>
    </Section>

    <Section n="3" title="Live Streaming Rules">
      <p>You must be visible during barber service streams. We reserve the right to terminate any stream violating this policy without prior notice.</p>
    </Section>

    <Section n="4" title="Enforcement">
      <p>We may issue warnings, temporary suspensions, or permanent bans based on severity. Appeals can be sent to <a href="mailto:APPEALS@BARBERHUB.TV">APPEALS@BARBERHUB.TV</a> within 14 days.</p>
    </Section>
  </LegalLayout>
);

export default AUP;
