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
      <p>
        <strong>Zero tolerance for copyrighted material.</strong> Broadcasting unauthorized copyrighted content during
        a live stream — including but not limited to commercial music, films, television programs, sporting events,
        or any third-party audio/visual work for which you do not hold a license or other valid right — is strictly
        prohibited. Violations result in:
      </p>
      <ul>
        <li>Immediate termination of the live stream without prior notice.</li>
        <li>A DMCA strike against the offending account, per our <a href="/dmca">Copyright / DMCA Policy</a>.</li>
        <li>Forfeiture of any associated competition entry, BB earnings from the stream, and prize-pool eligibility.</li>
        <li>Permanent account ban for repeat offenses.</li>
      </ul>
      <p>
        You are solely responsible for ensuring that all audio, visuals, branding, and background content shown in
        your stream are either original, licensed, or in the public domain.
      </p>
    </Section>


    <Section n="4" title="Enforcement">
      <p>We may issue warnings, temporary suspensions, or permanent bans based on severity. Appeals can be sent to <a href="mailto:APPEALS@BARBERHUB.TV">APPEALS@BARBERHUB.TV</a> within 14 days.</p>
    </Section>
  </LegalLayout>
);

export default AUP;
