import { LegalLayout } from '@/components/legal/LegalLayout';

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2><span className="num">{n}.</span> {title}</h2>
    {children}
  </section>
);

const Terms = () => (
  <LegalLayout title="Terms of Service">
    <Section n="1" title="Acceptance of Terms">
      <p>By using Barber-Hub at <a href="https://barberhub.tv">barberhub.tv</a>, you agree to these Terms. Operated by Barber Hub LLC.</p>
    </Section>

    <Section n="2" title="Eligibility">
      <p>You must be 18+. Competitions are unavailable where prohibited by law.</p>
    </Section>

    <Section n="3" title="Accounts">
      <ul>
        <li><strong>Barber Account:</strong> For competing, streaming, and monetizing. Tiers: Starter ($15/mo), Pro ($25/mo), Elite ($50/mo).</li>
        <li><strong>Fan Account:</strong> $5/mo for spectators and community members.</li>
      </ul>
    </Section>

    <Section n="4" title="Competitions">
      <p>Competitions are <strong>'Games of Skill'</strong>. Outcomes are determined by objective criteria, not chance. Entry fees (e.g., $50) are non-refundable. Voting is weighted: Barber accounts carry 3x the voting weight of Fan accounts.</p>
    </Section>

    <Section n="5" title="Barber Bucks (BB)">
      <p>In-platform currency. <strong>1 BB = $1 USD</strong>. BB are a limited-purpose digital credit and do not constitute legal tender. Subject to a $25 minimum withdrawal and 5% platform fee via Stripe Connect.</p>
    </Section>

    <Section n="6" title="Content & Takedowns">
      <ul>
        <li>You own your content. Do not post illegal, explicit, or infringing content.</li>
        <li>DMCA requests: <a href="mailto:DMCA@BARBERHUB.TV">DMCA@BARBERHUB.TV</a>.</li>
        <li>Barbers are solely responsible for maintaining local professional licenses; we do not verify standing.</li>
      </ul>
    </Section>

    <Section n="7" title="Limitation of Liability">
      <p>Platform provided <strong>"AS IS"</strong>. Barber-Hub's total liability is limited to the greater of $100 or the amount paid in the 3 months preceding the claim.</p>
    </Section>

    <Section n="8" title="Dispute Resolution">
      <p>Governed by the laws of <strong>New York</strong>. Disputes resolved by binding individual arbitration via AAA.</p>
    </Section>
  </LegalLayout>
);

export default Terms;
