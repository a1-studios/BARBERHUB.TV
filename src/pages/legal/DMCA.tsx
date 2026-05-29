import { LegalLayout } from '@/components/legal/LegalLayout';

export default function DMCA() {
  return (
    <LegalLayout title="Copyright / DMCA Policy">
      <section>
        <h2><span className="num">1.</span> Overview</h2>
        <p>
          Barber-Hub respects the intellectual property rights of others and expects its users to do the same. In accordance with
          the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond expeditiously to claims of copyright infringement
          committed using the Barber-Hub service that are reported to our Designated Copyright Agent.
        </p>
      </section>

      <section>
        <h2><span className="num">2.</span> Reporting Copyright Infringement</h2>
        <p>If you believe content on Barber-Hub infringes your copyright, please submit a notice including:</p>
        <ul>
          <li>A physical or electronic signature of the copyright owner or authorized agent.</li>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>Identification of the material claimed to be infringing and its URL on Barber-Hub.</li>
          <li>Your contact information (address, phone, email).</li>
          <li>A good-faith statement that the disputed use is not authorized.</li>
          <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act.</li>
        </ul>
        <p>You may also use the "Report Infringement" button available on any media post.</p>
      </section>

      <section>
        <h2><span className="num">3.</span> Designated Copyright Agent</h2>
        <p>
          DMCA notices should be sent to:<br />
          <strong>A1Studios Film LLC — Copyright Agent</strong><br />
          175 East Shore Road, Great Neck, NY<br />
          Email: <a href="mailto:dmca@barberhub.tv">dmca@barberhub.tv</a>
        </p>
      </section>


      <section>
        <h2><span className="num">4.</span> Counter-Notification</h2>
        <p>
          If you believe your content was removed in error, you may submit a counter-notice to the address above containing
          your signature, identification of the removed material, a statement under penalty of perjury that the removal was a
          mistake, and your consent to jurisdiction of the federal court in your district.
        </p>
      </section>

      <section>
        <h2><span className="num">5.</span> Repeat Infringer Policy</h2>
        <p>
          Barber-Hub will terminate, in appropriate circumstances, the accounts of users who are determined to be repeat
          infringers. Each valid DMCA takedown results in a strike against the offending account. Accounts that accumulate
          multiple strikes will be permanently terminated.
        </p>
      </section>

      <section>
        <h2><span className="num">6.</span> Safe Harbor</h2>
        <p>
          Barber-Hub operates as an interactive online platform under Section 512(c) of the DMCA. We do not pre-screen user
          uploads and rely on the reactive notice-and-takedown process described above to address infringement claims.
        </p>
      </section>

      <section>
        <h2><span className="num">7.</span> Misrepresentation</h2>
        <p>
          Any party who knowingly materially misrepresents that material is infringing or was removed by mistake may be liable
          for damages under 17 U.S.C. § 512(f).
        </p>
      </section>
    </LegalLayout>
  );
}
