import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const UPLOAD_ZONES = [
  {
    id: '10th',
    label: '10th Marksheet',
    documentType: '10th',
    fields: ['board', 'year', 'percentage/cgpa']
  },
  {
    id: '12th',
    label: '12th Marksheet',
    documentType: '12th',
    fields: ['board', 'year', 'percentage/cgpa', 'stream']
  },
  {
    id: 'graduation',
    label: 'Graduation',
    documentType: 'graduation',
    fields: ['university', 'degree', 'branch', 'year', 'cgpa']
  },
  {
    id: 'scorecard',
    label: 'Score Card',
    documentType: 'scorecard',
    fields: ['exam', 'year', 'total_score', 'percentile']
  }
]

export default function DocumentUpload({ onExtracted }) {
  const [zoneStates, setZoneStates] = useState({})

  // Initialize all zones to idle state
  const getZoneState = useCallback((zoneId) => {
    return zoneStates[zoneId] || { status: 'idle' }
  }, [zoneStates])

  const updateZoneState = useCallback((zoneId, newState) => {
    setZoneStates(prev => ({
      ...prev,
      [zoneId]: newState
    }))
  }, [])

  const handleUpload = useCallback(async (file, zoneId, documentType) => {
    // Validate file
    if (!file) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']

    if (file.size > maxSize) {
      updateZoneState(zoneId, {
        status: 'error',
        message: 'File exceeds 5MB limit'
      })
      return
    }

    if (!allowedTypes.includes(file.type)) {
      updateZoneState(zoneId, {
        status: 'error',
        message: 'Only JPG, PNG, or PDF files allowed'
      })
      return
    }

    updateZoneState(zoneId, { status: 'uploading' })

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', documentType)

      // Call edge function
      const response = await fetch(
        'https://siheziegpnrfjgzubjrk.supabase.co/functions/v1/ocr-extract',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      if (!data.ok) {
        throw new Error(data.error || 'OCR extraction failed')
      }

      // Success state
      updateZoneState(zoneId, {
        status: 'success',
        extracted: data.extracted,
        documentType: data.document_type
      })

      // Call parent callback
      if (onExtracted) {
        onExtracted(data.document_type, data.extracted)
      }
    } catch (error) {
      console.error('Upload error:', error)
      updateZoneState(zoneId, {
        status: 'error',
        message: error.message || 'Upload failed'
      })
    }
  }, [updateZoneState, onExtracted])

  const handleFileSelect = useCallback((e, zoneId, documentType) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file, zoneId, documentType)
    }
  }, [handleUpload])

  const handleDrop = useCallback((e, zoneId, documentType) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file, zoneId, documentType)
    }
  }, [handleUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const resetZone = useCallback((zoneId) => {
    updateZoneState(zoneId, { status: 'idle' })
  }, [updateZoneState])

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-6">Documents & OCR</h2>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-6">
        {UPLOAD_ZONES.map(zone => {
          const state = getZoneState(zone.id)
          const isIdle = state.status === 'idle'
          const isUploading = state.status === 'uploading'
          const isSuccess = state.status === 'success'
          const isError = state.status === 'error'

          return (
            <div key={zone.id}>
              {/* Upload Zone */}
              <div
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isIdle
                    ? 'border-[#1e3050] bg-[#0d1525] hover:border-[#c9a84c] cursor-pointer'
                    : isUploading
                    ? 'border-[#c9a84c] bg-[#0d1525]'
                    : isSuccess
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-red-500 bg-red-500/5'
                }`}
              >
                {/* Idle state */}
                {isIdle && (
                  <>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileSelect(e, zone.id, zone.documentType)}
                        onDrop={(e) => handleDrop(e, zone.id, zone.documentType)}
                        onDragOver={handleDragOver}
                        className="hidden"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-2">
                          {zone.label}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">
                          JPG, PNG, PDF up to 5MB
                        </p>
                      </div>
                    </label>
                  </>
                )}

                {/* Uploading state */}
                {isUploading && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
                    <p className="text-xs text-gray-600">Uploading...</p>
                  </div>
                )}

                {/* Success state */}
                {isSuccess && (
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <p className="text-sm font-semibold text-green-700">
                        {zone.label} uploaded
                      </p>
                    </div>

                    {/* Extracted fields */}
                    <div className="space-y-1 text-xs">
                      {state.extracted && Object.entries(state.extracted).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{key}:</span>
                          <span className="text-gray-900 font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Retry button */}
                    <button
                      onClick={() => resetZone(zone.id)}
                      className="mt-3 text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Re-upload
                    </button>
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-2">
                      Upload failed
                    </p>
                    <p className="text-xs text-red-500 mb-3">
                      {state.message}
                    </p>
                    <button
                      onClick={() => resetZone(zone.id)}
                      className="inline-block px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
