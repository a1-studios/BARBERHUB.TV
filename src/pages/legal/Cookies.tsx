import { LegalLayout } from '@/components/legal/LegalLayout';
import { Button } from '@/components/ui/button';
import { openCookiePreferences } from '@/lib/consent';

const Cookies = () => (
  <LegalLayout title="Cookie Policy">
    <section>
      <p>We use cookies to ensure platform security, process Stripe payments, and remember your preferences.</p>
    </section>

    <section>
      <h2><span className="num">1.</span> Essential</h2>
      <p><strong>Supabase Auth, Stripe.</strong> Cannot be disabled.</p>
    </section>

    <section>
      <h2><span className="num">2.</span> Analytics / Marketing</h2>
      <p><strong>Facebook Pixel.</strong> Only active if you opt-in via our Cookie Consent Manager. You can update your preferences at any time via the footer link.</p>
      <div className="mt-4">
        <Button
          onClick={openCookiePreferences}
          variant="outline"
          className="rounded-[12px] border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
        >
          Manage Cookie Preferences
        </Button>
      </div>
    </section>
  </LegalLayout>
);

export default Cookies;
