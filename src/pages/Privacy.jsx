import Layout from '../components/Layout'

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: June 2026</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-amber-900 font-semibold">Coming soon</p>
            <p className="text-amber-800 text-sm mt-2">
              Our privacy policy is being prepared. We'll have it published shortly.
            </p>
          </div>

          <p className="text-gray-600">
            In the meantime, if you have any privacy-related questions, please contact us at{' '}
            <a href="mailto:privacy@unidex.co.in" className="text-indigo-600 hover:underline">
              privacy@unidex.co.in
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}
