import Layout from '../components/Layout'

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: June 2026</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-amber-900 font-semibold">Coming soon</p>
            <p className="text-amber-800 text-sm mt-2">
              Our terms of service are being prepared. We'll have it published shortly.
            </p>
          </div>

          <p className="text-gray-600">
            In the meantime, if you have any questions about our terms, please contact us at{' '}
            <a href="mailto:legal@unidex.co.in" className="text-indigo-600 hover:underline">
              legal@unidex.co.in
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}
