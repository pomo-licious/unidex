import { useNavigate } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/Brand'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-[#10264c]"><PublicHeader />
      <div className="bg-white min-h-screen">
        <div className="max-w-[920px] mx-auto px-6 py-16 sm:px-10 sm:py-24">
          <button onClick={() => navigate('/')} className="text-[#225feb] hover:underline text-sm mb-8">
            ← Back to home
          </button>

          <h1 className="text-[clamp(42px,5vw,68px)] font-medium tracking-[-.06em] text-[#10264c] mb-5">Privacy Policy</h1>
          <p className="text-[#8798b2] mb-12">Effective date: June 9, 2026 · Operational details updated October 16, 2026</p>

          <div className="space-y-12 text-sm leading-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 1 — What data we collect</h2>
              <div className="overflow-x-auto border border-[#e1e8f3] rounded-lg">
                <table className="w-full text-sm text-[#526982]">
                  <thead className="bg-[#f6f8fc] border-b border-[#e1e8f3]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Data type</th>
                      <th className="px-4 py-3 text-left font-semibold">What exactly</th>
                      <th className="px-4 py-3 text-left font-semibold">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Account data</td>
                      <td className="px-4 py-3">Name, email, password (hashed)</td>
                      <td className="px-4 py-3">To create and manage your account</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Profile data</td>
                      <td className="px-4 py-3">Personal and academic details, entrance exam scores, work experience and optional last-drawn annual CTC</td>
                      <td className="px-4 py-3">To show college fit indicators and prepare your reusable application details</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Document data</td>
                      <td className="px-4 py-3">Uploaded academic documents, scorecards, CVs and photographs; extraction results and your corrections</td>
                      <td className="px-4 py-3">Private document storage and, when requested, OCR extraction for your review</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Application records</td>
                      <td className="px-4 py-3">Saved application drafts, tracked colleges, status changes and internal Unidex submission receipts</td>
                      <td className="px-4 py-3">To keep your application preparation and progress together</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Usage data</td>
                      <td className="px-4 py-3">Pages visited, features used</td>
                      <td className="px-4 py-3">To improve the product</td>
                    </tr>
                    <tr className="hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Device data</td>
                      <td className="px-4 py-3">Browser, OS, IP address</td>
                      <td className="px-4 py-3">Security and fraud prevention</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#8798b2] text-sm mt-4">The application does not request payment card or bank account details. Last-drawn annual CTC is optional compensation information and is saved if you enter or approve it. Upload only documents relevant to your application.</p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 2 — How we use your data</h2>
              <ul className="space-y-3 text-[#526982]">
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>To provide college discovery, score-based fit indicators, deadline tracking and reusable application preparation</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>To improve the product — usage patterns to fix bugs and build features</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>To send you reminders — deadline alerts you opt into</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>When you explicitly approve extraction for a specific document, its content is sent to OpenAI for GPT-based extraction. Extraction results and your corrections are linked to your account. You review and approve details before adding them to your profile.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>An internal Unidex submission receipt records the information you saved in Unidex. It does not mean an institution has received or accepted an application. Final college submissions take place on the institution’s own portal.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>We do not sell your data to any third party. Ever.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>We do not show you ads based on your data.</span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 3 — Who we share data with</h2>
              <div className="overflow-x-auto border border-[#e1e8f3] rounded-lg">
                <table className="w-full text-sm text-[#526982]">
                  <thead className="bg-[#f6f8fc] border-b border-[#e1e8f3]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Party</th>
                      <th className="px-4 py-3 text-left font-semibold">What they receive</th>
                      <th className="px-4 py-3 text-left font-semibold">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Supabase</td>
                      <td className="px-4 py-3">Account, profile, application and document records</td>
                      <td className="px-4 py-3">Authentication, database and private file storage</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Website hosting provider</td>
                      <td className="px-4 py-3">Website requests and technical delivery logs</td>
                      <td className="px-4 py-3">To deliver and operate the website</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">Google sign-in</td>
                      <td className="px-4 py-3">Account information used when you choose Google sign-in</td>
                      <td className="px-4 py-3">OAuth authentication</td>
                    </tr>
                    <tr className="hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3">OpenAI</td>
                      <td className="px-4 py-3">Content of the specific document you approve for extraction</td>
                      <td className="px-4 py-3">GPT-based extraction of suggested fields for your review; photographs are not sent for text extraction</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 4 — Your rights under DPDP Act 2023</h2>
              <ul className="space-y-2 text-[#526982] list-disc list-inside">
                <li>Access</li>
                <li>Correction</li>
                <li>Erasure</li>
                <li>Grievance redressal</li>
                <li>Nomination</li>
              </ul>
              <p className="text-[#526982] mt-6">Contact: <a href="mailto:privacy@unidex.co.in" className="text-[#225feb] hover:underline">privacy@unidex.co.in</a> — respond within 72 hours, action within 30 days</p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 5 — Data retention</h2>
              <div className="overflow-x-auto border border-[#e1e8f3] rounded-lg">
                <table className="w-full text-sm text-[#526982]">
                  <tbody>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3 font-semibold w-1/3">Account + profile data</td>
                      <td className="px-4 py-3">Until deletion</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3 font-semibold">Documents</td>
                      <td className="px-4 py-3">Uploaded files remain in private storage until you remove them or delete your account</td>
                    </tr>
                    <tr className="border-b border-[#e1e8f3] hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3 font-semibold">Analytics</td>
                      <td className="px-4 py-3">12 months</td>
                    </tr>
                    <tr className="hover:bg-[#f6f8fc]">
                      <td className="px-4 py-3 font-semibold">Extraction records and corrections</td>
                      <td className="px-4 py-3">Stored with the document record until removal; details already saved to your profile remain until you edit or delete them</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#8798b2] text-sm mt-4">Removing a document removes its stored file and extraction record. Details previously approved into your profile, and saved application records containing those details, are separate records. You can edit your profile and manage your saved records or request deletion at privacy@unidex.co.in.</p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 6 — Security</h2>
              <ul className="space-y-3 text-[#526982]">
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>AES-256 at rest</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>TLS 1.3 in transit</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>Row-level security</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>Hashed passwords</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#225feb]">•</span>
                  <span>72-hour breach notification</span>
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 7 — Cookies</h2>
              <p className="text-[#526982]">We use only essential session cookies. No advertising or tracking cookies.</p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-medium tracking-[-.035em] text-[#10264c] mb-5">Section 8 — Contact</h2>
              <div className="bg-[#f6f8fc] rounded-lg p-6 space-y-2 text-[#526982] border border-[#e1e8f3]">
                <p><span className="font-semibold">Data Protection Officer:</span> Paramvir Singh</p>
                <p><span className="font-semibold">Email:</span> <a href="mailto:privacy@unidex.co.in" className="text-[#225feb] hover:underline">privacy@unidex.co.in</a></p>
              </div>
            </section>
          </div>
        </div>
      </div>
    <PublicFooter /></div>
  )
}
