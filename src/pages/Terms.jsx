import { useNavigate } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/Brand'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-[#10264c]"><PublicHeader />
      <div className="bg-white min-h-screen">
        <div className="max-w-[920px] mx-auto px-6 py-16 sm:px-10 sm:py-24">
          <button onClick={() => navigate('/')} className="text-[#225feb] hover:underline text-sm mb-8">
            ← Back to home
          </button>

          <h1 className="text-[clamp(42px,5vw,68px)] font-medium tracking-[-.06em] text-[#10264c] mb-5">Terms of Service</h1>
          <p className="text-[#8798b2] mb-12">Effective date: June 9, 2026</p>

          <div className="space-y-12 text-sm leading-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 1 — Acceptance</h2>
              <p className="text-[#526982]">
                By accessing or using Unidex, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service. We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of changes.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 2 — What Unidex is</h2>
              <p className="text-[#526982]">
                Unidex is a platform designed to help MBA aspirants discover, apply to, and track their college applications. We provide tools including college matching, deadline management, application form filling assistance, and progress tracking. We are not a college, admissions agency, or guarantee acceptance to any institution. All results depend on your qualifications and colleges' admissions decisions.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 3 — Your account</h2>
              <div className="space-y-4 text-[#526982]">
                <p>To use Unidex, you must:</p>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate, complete information during signup</li>
                  <li>Maintain the confidentiality of your password</li>
                  <li>Be responsible for all activity under your account</li>
                  <li>Notify us immediately of unauthorized access</li>
                </ul>
                <p className="mt-4">We reserve the right to suspend or terminate accounts that violate these terms.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 4 — Acceptable use</h2>
              <p className="text-[#526982] mb-4">You agree NOT to:</p>
              <ul className="space-y-2 text-[#526982] list-disc list-inside ml-4">
                <li>Use the service for illegal purposes</li>
                <li>Submit false, forged, or misrepresented documents</li>
                <li>Attempt to access other users' accounts</li>
                <li>Scrape, crawl, or automate platform access</li>
                <li>Transmit malware, viruses, or harmful code</li>
                <li>Reverse-engineer or modify the platform</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Resell or redistribute access to the service</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 5 — Paid features</h2>
              <div className="space-y-3 text-[#526982]">
                <p><span className="font-semibold">Price:</span> ₹1,000 per year</p>
                <p><span className="font-semibold">What you get:</span> AI-powered form filling, advanced college matching, priority support, offline access</p>
                <p><span className="font-semibold">Refund policy:</span> Full refund if requested within 7 days of purchase, no questions asked</p>
                <p><span className="font-semibold">Automatic renewal:</span> Subscriptions renew annually unless cancelled via account settings</p>
                <p><span className="font-semibold">Cancellation:</span> You can cancel anytime in your account settings. Cancellation takes effect at the end of the current billing period.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 6 — Disclaimers</h2>
              <div className="space-y-3 text-[#526982]">
                <p>
                  Unidex is provided "as is" without warranty of any kind, express or implied. We do not guarantee:
                </p>
                <ul className="space-y-2 list-disc list-inside ml-4">
                  <li>Uninterrupted service availability</li>
                  <li>Accuracy of college data (verify with official sources)</li>
                  <li>Success in college admissions</li>
                  <li>Accuracy of OCR document extraction (always review)</li>
                </ul>
                <p className="mt-4">
                  You use the service at your own risk and are responsible for verifying all information before submitting applications.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 7 — Limitation of liability</h2>
              <p className="text-[#526982]">
                To the fullest extent permitted by law, Unidex and its team shall not be liable for indirect, incidental, special, or consequential damages including loss of profits, data loss, or reputational harm. In no event shall our total liability exceed the amount you paid us in the 12 months prior to the claim.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 8 — Governing law</h2>
              <p className="text-[#526982]">
                These Terms are governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. You irrevocably submit to the exclusive jurisdiction of the courts located in Pune, India for any legal proceedings arising out of or related to these Terms or your use of the service.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 9 — Contact</h2>
              <div className="bg-[#f6f8fc] rounded-lg p-6 space-y-2 text-[#526982] border border-[#e1e8f3]">
                <p><span className="font-semibold">Questions about these terms?</span></p>
                <p><a href="mailto:legal@unidex.co.in" className="text-[#225feb] hover:underline">legal@unidex.co.in</a></p>
              </div>
            </section>
          </div>
        </div>
      </div>
    <PublicFooter /></div>
  )
}
