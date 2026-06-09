import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <button onClick={() => navigate('/')} className="text-[#c9a84c] hover:underline text-sm mb-8">
            ← Back to home
          </button>

          <h1 className="text-5xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600 mb-12">Effective date: June 9, 2026</p>

          <div className="space-y-12">
            {/* Section 1 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 1 — What data we collect</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Data type</th>
                      <th className="px-4 py-3 text-left font-semibold">What exactly</th>
                      <th className="px-4 py-3 text-left font-semibold">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Account data</td>
                      <td className="px-4 py-3">Name, email, password (hashed)</td>
                      <td className="px-4 py-3">To create and manage your account</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Profile data</td>
                      <td className="px-4 py-3">CAT/GMAT scores, academic marks, work experience</td>
                      <td className="px-4 py-3">To match you with colleges and fill forms</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Document data</td>
                      <td className="px-4 py-3">Marksheet images, scorecards you upload</td>
                      <td className="px-4 py-3">OCR extraction for your profile</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Usage data</td>
                      <td className="px-4 py-3">Pages visited, features used</td>
                      <td className="px-4 py-3">To improve the product</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">Device data</td>
                      <td className="px-4 py-3">Browser, OS, IP address</td>
                      <td className="px-4 py-3">Security and fraud prevention</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-600 text-sm mt-4">We do not collect financial information, government IDs, biometric data, or data from minors.</p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 2 — How we use your data</h2>
              <ul className="space-y-3 text-gray-900">
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>To provide the service — college matching, deadline tracking, form filling</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>To improve the product — usage patterns to fix bugs and build features</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>To send you reminders — deadline alerts you opt into</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>To train our AI — OCR extractions stored anonymously to improve accuracy. Opt out: privacy@unidex.co.in</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>We do not sell your data to any third party. Ever.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>We do not show you ads based on your data.</span>
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 3 — Who we share data with</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Party</th>
                      <th className="px-4 py-3 text-left font-semibold">What they receive</th>
                      <th className="px-4 py-3 text-left font-semibold">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Supabase (USA)</td>
                      <td className="px-4 py-3">Encrypted database storage</td>
                      <td className="px-4 py-3">Our database infrastructure</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Vercel (USA)</td>
                      <td className="px-4 py-3">Anonymised request logs</td>
                      <td className="px-4 py-3">Our hosting provider</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">Google (USA)</td>
                      <td className="px-4 py-3">Email address only</td>
                      <td className="px-4 py-3">OAuth authentication</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">Anthropic / Google AI</td>
                      <td className="px-4 py-3">Document images (temporarily, not stored)</td>
                      <td className="px-4 py-3">OCR and AI form fill processing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 4 — Your rights under DPDP Act 2023</h2>
              <ul className="space-y-2 text-gray-900 list-disc list-inside">
                <li>Access</li>
                <li>Correction</li>
                <li>Erasure</li>
                <li>Grievance redressal</li>
                <li>Nomination</li>
              </ul>
              <p className="text-gray-900 mt-6">Contact: <a href="mailto:privacy@unidex.co.in" className="text-[#c9a84c] hover:underline">privacy@unidex.co.in</a> — respond within 72 hours, action within 30 days</p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 5 — Data retention</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-gray-900">
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold w-1/3">Account + profile data</td>
                      <td className="px-4 py-3">Until deletion</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">Documents</td>
                      <td className="px-4 py-3">90 days</td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">Analytics</td>
                      <td className="px-4 py-3">12 months</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">OCR training anonymised</td>
                      <td className="px-4 py-3">Indefinitely</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-600 text-sm mt-4">When you delete your account, all PII is permanently deleted within 30 days.</p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 6 — Security</h2>
              <ul className="space-y-3 text-gray-900">
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>AES-256 at rest</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>TLS 1.3 in transit</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>Row-level security</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>Hashed passwords</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#c9a84c]">•</span>
                  <span>72-hour breach notification</span>
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 7 — Cookies</h2>
              <p className="text-gray-900">We use only essential session cookies. No advertising or tracking cookies.</p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-3xl font-bold text-[#c9a84c] mb-6">Section 8 — Contact</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-900 border border-gray-200">
                <p><span className="font-semibold">Data Protection Officer:</span> Paramvir Singh</p>
                <p><span className="font-semibold">Email:</span> <a href="mailto:privacy@unidex.co.in" className="text-[#c9a84c] hover:underline">privacy@unidex.co.in</a></p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}
