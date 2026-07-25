// ─────────────────────────────────────────────────────────────────────────────
// src/pages/DocumentUpload.jsx — Student document upload and management
//
// Drag-and-drop upload for:
// - Resume (PDF, max 5MB)
// - Transcripts (PDF, max 10MB)
// - Profile photo (JPG/PNG, max 2MB)
//
// Files stored in Supabase Storage (student-documents bucket)
// Public URLs saved to students.documents JSONB
//
// Route: /documents
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import DocumentUploadOCR from '../components/DocumentUpload'
import { supabase } from '../lib/supabase'

const UPLOAD_CONFIG = {
  resume: { accepts: '.pdf', maxSize: 5, label: 'Resume' },
  transcript: { accepts: '.pdf', maxSize: 10, label: 'Transcripts' },
  photo: { accepts: '.jpg,.png', maxSize: 2, label: 'Profile Photo' },
}

export default function DocumentUpload() {
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState({ resume: null, transcript: null, photo: null })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(null)
  const [toast, setToast] = useState(null)

  // ── Page title ──────────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'Documents · Unidex'
  }, [])

  // Get current user and load documents
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // Load existing documents
  useEffect(() => {
    if (!user) return

    async function loadDocuments() {
      try {
        const { data } = await supabase
          .from('students')
          .select('documents')
          .eq('user_id', user.id)
          .single()

        if (data?.documents) {
          setDocuments({
            resume: data.documents.resume_url ? { url: data.documents.resume_url, name: 'Resume.pdf' } : null,
            transcript: data.documents.transcript_url ? { url: data.documents.transcript_url, name: 'Transcripts.pdf' } : null,
            photo: data.documents.photo_url ? { url: data.documents.photo_url, name: 'photo.jpg' } : null,
          })
        }
      } catch (err) {
        console.error('Failed to load documents:', err)
      }
    }

    loadDocuments()
  }, [user?.id])

  // Validate file
  function validateFile(file, type) {
    const config = UPLOAD_CONFIG[type]
    if (file.size > config.maxSize * 1024 * 1024) {
      setError(`${config.label} must be under ${config.maxSize}MB`)
      return false
    }
    if (type === 'photo' && !['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Profile photo must be JPG or PNG')
      return false
    }
    if (type !== 'photo' && file.type !== 'application/pdf') {
      setError(`${config.label} must be PDF`)
      return false
    }
    return true
  }

  // Handle upload
  async function handleUpload(file, type) {
    if (!validateFile(file, type)) return

    setUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}_${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${type}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      // Update student documents JSONB
      const docKey = type === 'resume' ? 'resume_url' : type === 'transcript' ? 'transcript_url' : 'photo_url'
      const { data: student, error: fetchErr } = await supabase
        .from('students')
        .select('documents')
        .eq('user_id', user.id)
        .single()

      if (fetchErr) throw fetchErr

      const updatedDocs = student?.documents || {}
      updatedDocs[docKey] = publicUrl

      const { error: updateErr } = await supabase
        .from('students')
        .update({ documents: updatedDocs })
        .eq('user_id', user.id)

      if (updateErr) throw updateErr

      // Update local state
      setDocuments(prev => ({
        ...prev,
        [type]: { url: publicUrl, name: file.name }
      }))

      setUploading(false)
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  // Drag handlers
  function handleDrag(e, type) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(type)
    } else if (e.type === 'dragleave') {
      setDragActive(null)
    }
  }

  function handleDrop(e, type) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleUpload(files[0], type)
    }
  }

  // Delete document
  async function handleDelete(type) {
    try {
      const docKey = type === 'resume' ? 'resume_url' : type === 'transcript' ? 'transcript_url' : 'photo_url'
      const { data: student } = await supabase
        .from('students')
        .select('documents')
        .eq('user_id', user.id)
        .single()

      const updatedDocs = student?.documents || {}
      delete updatedDocs[docKey]

      await supabase
        .from('students')
        .update({ documents: updatedDocs })
        .eq('user_id', user.id)

      setDocuments(prev => ({ ...prev, [type]: null }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage your application documents</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(UPLOAD_CONFIG).map(([type, config]) => (
            <div key={type} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{config.label}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Max {config.maxSize}MB • {type === 'photo' ? 'JPG/PNG' : 'PDF'}</p>
                </div>
              </div>

              {documents[type] ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{documents[type].name}</p>
                    <a
                      href={documents[type].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1"
                    >
                      View file
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                      Replace
                      <input
                        type="file"
                        accept={config.accepts}
                        onChange={(e) => e.target.files && handleUpload(e.target.files[0], type)}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => handleDelete(type)}
                      disabled={uploading}
                      className="px-3 py-1.5 rounded-lg border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={(e) => handleDrag(e, type)}
                  onDragLeave={(e) => handleDrag(e, type)}
                  onDragOver={(e) => handleDrag(e, type)}
                  onDrop={(e) => handleDrop(e, type)}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragActive === type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <label className="block cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">Drag and drop your {config.label.toLowerCase()}</p>
                    <p className="text-xs text-gray-500 mt-1">or</p>
                    <button
                      type="button"
                      className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                      onClick={() => document.getElementById(`file-input-${type}`).click()}
                      disabled={uploading}
                    >
                      Select file
                    </button>
                    <input
                      id={`file-input-${type}`}
                      type="file"
                      accept={config.accepts}
                      onChange={(e) => e.target.files && handleUpload(e.target.files[0], type)}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        {uploading && (
          <div className="flex items-center justify-center py-4 gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm text-gray-600">Uploading…</p>
          </div>
        )}

        {/* OCR Document Upload Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Academic Documents (OCR Extraction)</h2>
          <DocumentUploadOCR onExtracted={(type, data) => {
            setToast({ type: 'success', message: 'Document extracted and saved ✓' })
            setTimeout(() => setToast(null), 3000)
          }} />
        </div>

        {/* AI Form Fill Teaser */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">AI Form Fill — coming soon</p>
            <p className="text-indigo-200 text-xs mt-1">Claude will auto-fill your SOP and application forms using your profile.</p>
          </div>
          <button className="shrink-0 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors">
            Join waitlist
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </Layout>
  )
}
