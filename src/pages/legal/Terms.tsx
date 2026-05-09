import { LegalLayout } from '@/components/legal/LegalLayout';

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section>
    <h2><span className="num">{n}.</span> {title}</h2>
    {children}
  </section>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3>{children}</h3>
);

const tiers = [
  {
    name: 'Starter',
    price: '$15/mo',
    perks: [
      'Appointment Management: Access to the digital booking calendar.',
      'Standard Visibility: Listed in the Barber-Hub Directory (text-only search results).',
      'Base Challenging: Up to five (5) Staked Challenges per billing cycle.',
      'Media: Standard portfolio image hosting.',
    ],
  },
  {
    name: 'Pro',
    price: '$25/mo',
    perks: [
      'Financial Toggles: Toggle appointment fees "On" or "Off" (charge vs. free hold).',
      'Promoted Visibility: Primary Map Pin with a Neon Cyan glow.',
      'Unlimited Challenging: Issue unlimited Staked Challenges.',
      'M4M Trust Badge: M4M Level 1 Certification (Static Heart Outline).',
      'Audience Engagement: Live-stream mini-games and BB tipping/gifting.',
    ],
  },
  {
    name: 'Elite',
    price: '$50/mo',
    perks: [
      'Battle Authority: Host and manage local/regional Battles and Tournaments.',
      'The Sunday Arena: Eligibility for the National Championship and high-stakes duels.',
      'Jury Eligibility: Verified Jury Member for official scoring.',
      'Maximum Visibility: Priority Map Placement (Titan Pin) and "Sunday Recap" features.',
      'Beating M4M Heart: Pulsing Heartbeat indicator.',
      'Sponsor Access: Direct channel for product sponsorship and "Barber Hub Approved" gear deals.',
    ],
  },
];

const fanPerks = [
  'Unlimited appointments and rescheduling within the time-frame set by the booked barber.',
  'Voting Rights: Vote in official Battles and the Sunday Arena.',
  'Exclusive offers from partners and sponsors, plus special rates when purchasing Barber Bucks.',
  'Community Access: Participation in global chats and fan-specific mini-games.',
  'Support Logic: Enhanced profile customization to "Flag" and support specific barbers.',
];

const Terms = () => (
  <LegalLayout title="Terms of Service">
    <Section n="1" title="Acceptance of Terms">
      <p>
        By creating an account or using Barber-Hub ("Platform," "we," "us," or "our") at{' '}
        <a href="https://barberhub.tv">barberhub.tv</a>, you ("User," "you") agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform.
      </p>
      <p>These Terms apply to all users, including barbers, fans, spectators, and visitors.</p>
      <p><strong>[COMPANY LEGAL NAME]</strong> operates Barber-Hub.</p>
    </Section>

    <Section n="2" title="Eligibility">
      <p>You must be at least 18 years old (or the age of majority in your jurisdiction, whichever is higher) to create an account. By registering, you confirm that you meet this requirement.</p>
      <p>Barber-Hub is available globally. Certain features — including competitions and prize payouts — may be restricted in jurisdictions where they are prohibited by local law. You are responsible for ensuring your use complies with the laws of your country.</p>
    </Section>

    <Section n="3" title="Accounts">
      <SubHeading>3.1 Registration</SubHeading>
      <p>You must provide accurate, complete information when creating your account. You are responsible for keeping your credentials secure.</p>

      <SubHeading>3.2 Account Types</SubHeading>
      <p>Barber-Hub has two primary account types:</p>
      <ul>
        <li><strong>Barber Account</strong> — for licensed or practicing barbers competing, streaming, and monetizing on the platform.</li>
        <li><strong>Fan Account</strong> — for spectators, supporters, and community members.</li>
      </ul>

      <SubHeading>3.3 Subscription Plans</SubHeading>
      <p>Barber accounts may subscribe to one of three paid tiers:</p>

      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs sm:text-sm border border-border rounded-[12px] overflow-hidden">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-bold uppercase tracking-wide text-cyan-300 w-[18%]">Plan</th>
              <th className="text-left p-3 font-bold uppercase tracking-wide text-cyan-300 w-[18%]">Price</th>
              <th className="text-left p-3 font-bold uppercase tracking-wide text-cyan-300">Access Level</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.name} className="border-t border-border align-top">
                <td className="p-3 font-bold text-white">{t.name}</td>
                <td className="p-3 text-white font-mono">{t.price}</td>
                <td className="p-3">
                  <ul className="!mt-0 !pl-4 space-y-1">
                    {t.perks.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4">Fan subscriptions are available at <strong>$5/mo</strong> and unlock:</p>
      <ul>
        {fanPerks.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <p>Subscriptions renew automatically. You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period. No refunds for partial months unless required by applicable law.</p>

      <SubHeading>3.4 Account Termination</SubHeading>
      <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraud, or are inactive for extended periods. You may delete your account at any time.</p>
    </Section>

    <Section n="4" title="Competitions">
      <SubHeading>4.1 Entry</SubHeading>
      <p>Competitions require a minimum <strong>$50 entry fee</strong> per category (or as otherwise posted for specific events). Entry fees are non-refundable once submitted, except where a competition is cancelled by Barber-Hub.</p>
      <p><strong>Point structure:</strong> Barber A and Barber B who show up to battle each receive one (1) point. After a 7-day voting period, the winner receives an additional two (2) points for a total of three (3). This continues until 25 finalists remain.</p>

      <SubHeading>4.2 Competition Categories</SubHeading>
      <p>Barber-Hub currently supports 5 competition categories: <strong>Classic, Creative, Viral, Fast, and Color</strong>. Additional categories may be added at Barber-Hub's discretion.</p>

      <SubHeading>4.3 Eligibility</SubHeading>
      <p>Competitions are open to barbers of all nationalities unless otherwise restricted by the rules of a specific event.</p>

      <SubHeading>4.4 Voting</SubHeading>
      <p>Voting is weighted: registered barber accounts carry <strong>3x</strong> the voting weight of fan accounts. This weighting is designed to prioritize peer evaluation. By participating, you accept this voting structure.</p>

      <SubHeading>4.5 Prizes</SubHeading>
      <p>Prizes (including the Global Barber League <strong>$25,000 prize pool</strong>) are distributed as stated in the specific competition rules. Prize payouts are processed via Stripe Connect and subject to applicable tax withholding. Winners are responsible for any taxes owed in their jurisdiction.</p>
      <p>Barber-Hub reserves the right to withhold prizes if there is evidence of fraud, manipulation, or violation of competition rules.</p>

      <SubHeading>4.6 Decisions</SubHeading>
      <p>All competition judging, voting outcomes, and administrative decisions made by Barber-Hub are final and binding. Disputes regarding competition outcomes must be submitted within <strong>7 days</strong> of the result being posted.</p>
    </Section>

    <Section n="5" title="Barber Bucks (BB)">
      <SubHeading>5.1 What They Are</SubHeading>
      <p>Barber Bucks ("BB") is Barber-Hub's in-platform currency. During MVP: <strong>5 BB = $1 USD</strong>.</p>

      <SubHeading>5.2 Earning & Spending</SubHeading>
      <p>BB can be earned through donations, booking and completing appointments, affiliate links for authorized partners, challenges, merchandise, and revenue share. BB can be spent on competition entries, challenges, tipping, digital products, and merchandise.</p>

      <SubHeading>5.3 Withdrawals</SubHeading>
      <p>BB can be withdrawn to your connected bank account via Stripe Connect, subject to:</p>
      <ul>
        <li>A <strong>$25 minimum</strong> withdrawal</li>
        <li>A <strong>5% platform fee</strong> on all withdrawals</li>
        <li>Identity verification requirements set by Stripe</li>
      </ul>

      <SubHeading>5.4 No Cash Guarantee</SubHeading>
      <p>BB has no guaranteed monetary value outside the platform. Barber-Hub reserves the right to modify the BB exchange rate with <strong>30 days' notice</strong>. BB balances are not FDIC insured and are not considered a bank deposit.</p>

      <SubHeading>5.5 Future Token</SubHeading>
      <p>Barber-Hub may introduce a blockchain-based token in the future. Any such transition will be governed by separate terms and will not automatically affect existing BB balances without notice and consent.</p>
    </Section>

    <Section n="6" title="Fan Donations">
      <p>Fans may send monetary donations to barbers through the platform. Donations are processed via Stripe. Barber-Hub takes a <strong>5% platform fee</strong> on all donations. Donations are voluntary and non-refundable.</p>
    </Section>

    <Section n="7" title="Content & Creator Rules">
      <SubHeading>7.1 Your Content</SubHeading>
      <p>You retain ownership of content you upload. By posting content on Barber-Hub, you grant us a non-exclusive, royalty-free, worldwide license to display, distribute, promote, and store your content for the purpose of operating the platform.</p>

      <SubHeading>7.2 Content Standards</SubHeading>
      <p>You must not post content that:</p>
      <ul>
        <li>Is illegal, defamatory, harassing, or threatening</li>
        <li>Infringes on third-party intellectual property</li>
        <li>Contains nudity, sexual content, or graphic violence</li>
        <li>Constitutes spam or misleading information</li>
        <li>Impersonates another person or entity</li>
      </ul>

      <SubHeading>7.3 Live Streaming</SubHeading>
      <p>Live streams are subject to the same content standards. We reserve the right to terminate streams that violate these Terms without prior notice.</p>

      <SubHeading>7.4 Creator Hub</SubHeading>
      <p>Digital products listed in the Creator Hub must be original works you own. You are responsible for delivering purchased products and for any disputes with buyers.</p>

      <SubHeading>7.5 Takedowns</SubHeading>
      <p>We will respond to valid copyright takedown requests under the Digital Millennium Copyright Act (DMCA). To file a takedown notice, contact: <a href="mailto:DMCA@BARBERHUB.TV">[DMCA@BARBERHUB.TV]</a>.</p>
    </Section>

    <Section n="8" title="Booking">
      <SubHeading>8.1 MVP Booking</SubHeading>
      <p>The booking system (MVP) supports fixed-address appointments only. Barber-Hub facilitates the booking connection but is not a party to the appointment contract between the barber and client.</p>

      <SubHeading>8.2 Disputes</SubHeading>
      <p>Booking disputes are between the barber and client. Barber-Hub may, at its discretion, assist in resolving disputes but is not liable for no-shows, cancellations, or service quality.</p>
    </Section>

    <Section n="9" title="Payments & Billing">
      <p>All payments are processed by Stripe. By using paid features, you agree to Stripe's terms of service. Barber-Hub does not store your payment card data.</p>
      <p>Barber-Hub reserves the right to change pricing with <strong>30 days' notice</strong>. Continued use after a price change constitutes acceptance.</p>
    </Section>

    <Section n="10" title="Prohibited Conduct">
      <p>You may not:</p>
      <ul>
        <li>Create fake accounts or manipulate votes/competitions</li>
        <li>Reverse-engineer, scrape, or abuse the platform's API</li>
        <li>Use the platform for money laundering or financial fraud</li>
        <li>Harass, threaten, or discriminate against other users</li>
        <li>Circumvent payment systems or attempt to bypass the platform fee</li>
        <li>Use automated tools (bots, scripts) without written permission</li>
      </ul>
      <p>Violations may result in immediate account suspension, forfeiture of BB balances, and legal action.</p>
    </Section>

    <Section n="11" title="Intellectual Property">
      <p>All Barber-Hub branding, design, code, and proprietary content — including the Barber-Hub name, logo, and "Barber Bucks" — are owned by <strong>[COMPANY LEGAL NAME]</strong> and protected by intellectual property law. You may not use them without written permission.</p>
    </Section>

    <Section n="12" title="Disclaimers">
      <p className="uppercase text-xs tracking-wide">The platform is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted service, prize availability, or that the platform will be error-free.</p>
      <p className="uppercase text-xs tracking-wide">Barber-Hub is not responsible for the actions, content, or services of any user, barber, or third party on the platform.</p>
    </Section>

    <Section n="13" title="Limitation of Liability">
      <p className="uppercase text-xs tracking-wide">To the maximum extent permitted by law, Barber-Hub's total liability to you for any claim arising from these Terms or use of the platform is limited to the greater of $100 or the amount you paid to us in the 3 months preceding the claim.</p>
      <p className="uppercase text-xs tracking-wide">We are not liable for indirect, incidental, special, consequential, or punitive damages — including lost profits, lost data, or loss of goodwill.</p>
    </Section>

    <Section n="14" title="Indemnification">
      <p>You agree to indemnify and hold harmless Barber-Hub, its officers, employees, and affiliates from any claims, damages, or expenses (including legal fees) arising from your use of the platform, your content, or your violation of these Terms.</p>
    </Section>

    <Section n="15" title="Dispute Resolution">
      <SubHeading>15.1 Informal Resolution</SubHeading>
      <p>Before filing any legal claim, you agree to contact us at <a href="mailto:LEGAL@BARBERHUB.TV">[LEGAL@BARBERHUB.TV]</a> and attempt to resolve the dispute informally within 30 days.</p>

      <SubHeading>15.2 Arbitration</SubHeading>
      <p>If informal resolution fails, disputes will be resolved by binding individual arbitration under the rules of <strong>[ARBITRATION BODY — e.g., AAA or JAMS]</strong>, not in court. Class actions are waived.</p>

      <SubHeading>15.3 Exceptions</SubHeading>
      <p>Either party may seek injunctive relief in court for intellectual property violations or urgent matters.</p>

      <SubHeading>15.4 Governing Law</SubHeading>
      <p>These Terms are governed by the laws of <strong>[STATE/JURISDICTION — e.g., New York]</strong>, without regard to conflict of law principles.</p>
      <p className="italic"><strong>Note for EU/UK users:</strong> Mandatory consumer protection laws in your jurisdiction may override the arbitration clause. EU users retain the right to bring claims before their local courts.</p>
    </Section>

    <Section n="16" title="Changes to These Terms">
      <p>We may update these Terms as the platform evolves. We'll notify you of significant changes via email or in-app notice at least <strong>14 days</strong> in advance. Continued use after the effective date constitutes acceptance.</p>
    </Section>
  </LegalLayout>
);

export default Terms;
