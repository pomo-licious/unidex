import Layout from '../components/Layout'

export default function About() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About Unidex</h1>
        <p className="text-gray-600 mb-8">Last updated: June 2026</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-900 font-semibold">India's MBA Application Hub</p>
            <p className="text-blue-800 text-sm mt-2">
              Unidex is dedicated to simplifying the MBA application process for aspiring students across India.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h2>
            <p className="text-gray-600">
              To help every MBA aspirant discover, complete, and track their applications with confidence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h2>
            <p className="text-gray-600">
              To become India's trusted application infrastructure for higher education.
            </p>
          </section>

          <p className="text-gray-600">
            For more information, please contact us at{' '}
            <a href="mailto:hello@unidex.co.in" className="text-indigo-600 hover:underline">
              hello@unidex.co.in
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}
