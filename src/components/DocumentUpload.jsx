import { useState, useCallback, useEffect } from 'react'
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
    label: 'Graduation Transcript',
    documentType: 'graduation',
    fields: ['university', 'degree', 'branch', 'year', 'cgpa']
  },
  {
    id: 'scorecard',
    label: 'Score Card (CAT/GMAT/GRE)',
    documentType: 'scorecard',
    fields: ['exam', 'year', 'total_score', 'percentile']
  }
]

export default function DocumentUpload({ onExtracted }) {
  console.log('[DocumentUpload] component rendered')
  const [zoneStates, setZoneStates] = useState({})
  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [initError, setInitError] = useState(null)
  const [toast, setToast] = useState(null)

  // FIX #1: Changed useState to useEffect
  useEffect(() => {
    console.log('[DocumentUpload] useEffect fired')
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[DocumentUpload] session:', session?.user?.id ?? 'NO SESSION')
        if (!session) {
          setInitError('Not authenticated')
          return
        }

        setUser(session.user)

        // FIX #4: Add error handling for student lookup
        const { data, error } = await supabase
          .from('students')
          .select('id, documents_uploaded')
          .eq('user_id', session.user.id)
          .single()

        console.log('[DocumentUpload] student result:', data, 'error:', error)

        if (error) {
          console.error('Student lookup failed:', error)
          setInitError('Could not load student profile')
          return
        }

        if (!data) {
          setInitError('Student profile not found')
          return
        }

        setStudent(data)
        setInitError(null)
      } catch (err) {
        console.error('Initialization error:', err)
        setInitError('Failed to initialize component')
      }
    })()
  }, [])

  // Get zone state with defaults
  const getZoneState = useCallback((zoneId) => {
    return zoneStates[zoneId] || { status: 'idle' }
  }, [zoneStates])

  const updateZoneState = useCallback((zoneId, newState) => {
    setZoneStates(prev => ({
      ...prev,
      [zoneId]: newState
    }))
  }, [])

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Handle file upload
  const handleUpload = useCallback(async (file, zoneId, documentType) => {
    console.log('[DocumentUpload] file selected:', file?.name, 'student:', student?.id ?? 'NULL')
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

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
        message: 'Only JPG, PNG, WebP, or PDF files allowed'
      })
      return
    }

    updateZoneState(zoneId, { status: 'uploading' })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', documentType)

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

      // Move to correction phase
      updateZoneState(zoneId, {
        status: 'correction',
        extracted: data.extracted,
        documentType: data.document_type,
        correctedValues: { ...data.extracted },
        editingFields: {}
      })
    } catch (error) {
      console.error('Upload error:', error)
      updateZoneState(zoneId, {
        status: 'error',
        message: error.message || 'Upload failed'
      })
    }
  }, [updateZoneState])

  // Handle field correction
  const handleFieldChange = useCallback((zoneId, fieldKey, value) => {
    const state = getZoneState(zoneId)
    updateZoneState(zoneId, {
      ...state,
      correctedValues: {
        ...state.correctedValues,
        [fieldKey]: value
      }
    })
  }, [getZoneState, updateZoneState])

  // Toggle edit mode for a field
  const toggleEditField = useCallback((zoneId, fieldKey) => {
    const state = getZoneState(zoneId)
    updateZoneState(zoneId, {
      ...state,
      editingFields: {
        ...state.editingFields,
        [fieldKey]: !state.editingFields?.[fieldKey]
      }
    })
  }, [getZoneState, updateZoneState])

  // Save corrections and log training data
  const handleConfirmAndSave = useCallback(async (zoneId, documentType, correctedValues) => {
    // FIX #2: Don't silently return — show user feedback
    if (!student?.id || !user?.id) {
      const errorMsg = 'Student profile not loaded. Please refresh the page.'
      console.error(errorMsg)
      showToast(errorMsg, 'error')
      updateZoneState(zoneId, {
        status: 'error',
        message: errorMsg
      })
      return
    }

    updateZoneState(zoneId, { status: 'saving' })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Not authenticated')

      // Map document type to column
      const columnMap = {
        '10th': 'academic_10th',
        '12th': 'academic_12th',
        'graduation': 'academic_graduation',
        'scorecard': 'exam_scores'
      }

      const columnName = columnMap[documentType]
      if (!columnName) throw new Error('Invalid document type')

      // Prepare update data for students table
      const updateData = {
        [columnName]: correctedValues,
        documents_uploaded: []
      }

      // Get current documents_uploaded array
      const { data: currentStudent, error: fetchError } = await supabase
        .from('students')
        .select('documents_uploaded')
        .eq('id', student.id)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch current profile: ${fetchError.message}`)
      }

      updateData.documents_uploaded = currentStudent?.documents_uploaded || []
      if (!updateData.documents_uploaded.includes(documentType)) {
        updateData.documents_uploaded.push(documentType)
      }

      // Save to students table
      const { error: studentError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', student.id)

      if (studentError) throw new Error(`Failed to save profile: ${studentError.message}`)

      // FIX #3: Don't ignore training data errors — report them
      const { error: trainingError } = await supabase
        .from('ocr_training_data')
        .update({
          human_verified: true,
          human_corrected_data: correctedValues
        })
        .eq('student_id', student.id)
        .eq('document_type', documentType)
        .order('created_at', { ascending: false })
        .limit(1)

      if (trainingError) {
        console.warn('Training data update failed:', trainingError)
        // Still show success for profile save, but warn about training log
        showToast('Profile saved, but training data update failed', 'warning')
      } else {
        showToast('Profile updated ✓', 'success')
      }

      // Show success state
      updateZoneState(zoneId, {
        status: 'success',
        extracted: correctedValues,
        documentType
      })

      // Call parent callback
      if (onExtracted) {
        onExtracted(documentType, correctedValues)
      }
    } catch (error) {
      console.error('Save error:', error)
      const errorMsg = error.message || 'Save failed'
      showToast(errorMsg, 'error')
      updateZoneState(zoneId, {
        status: 'error',
        message: errorMsg
      })
    }
  }, [student?.id, user?.id, updateZoneState, showToast, onExtracted])

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

  // Show initialization error
  if (initError) {
    return (
      <div className="w-full">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Documents & OCR</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <p className="font-medium">Unable to load documents section</p>
          <p className="text-xs mt-1">{initError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-6">Documents & OCR</h2>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-6">
        {UPLOAD_ZONES.map(zone => {
          const state = getZoneState(zone.id)
          const isIdle = state.status === 'idle'
          const isUploading = state.status === 'uploading'
          const isCorrection = state.status === 'correction'
          const isSaving = state.status === 'saving'
          const isSuccess = state.status === 'success'
          const isError = state.status === 'error'

          return (
            <div key={zone.id}>
              {/* Upload Zone */}
              <div
                className={`relative rounded-lg border-2 p-8 transition-colors ${
                  isIdle
                    ? 'border-dashed border-[#1e3050] bg-[#0d1525] hover:border-[#c9a84c] cursor-pointer'
                    : isUploading
                    ? 'border-solid border-[#c9a84c] bg-[#0d1525]'
                    : isCorrection
                    ? 'border-solid border-amber-500 bg-amber-500/5'
                    : isSuccess
                    ? 'border-solid border-green-500 bg-green-500/5'
                    : 'border-solid border-red-500 bg-red-500/5'
                }`}
              >
                {/* Idle state */}
                {isIdle && (
                  <>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
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
                          JPG, PNG, WebP, PDF up to 5MB
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

                {/* Correction state - editable fields */}
                {isCorrection && (
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-amber-500 text-xl">✎</span>
                      <p className="text-sm font-semibold text-amber-700">
                        Review & correct {zone.label}
                      </p>
                    </div>

                    {/* Extracted fields with edit toggles */}
                    <div className="space-y-2 mb-4">
                      {state.extracted && Object.entries(state.extracted).map(([key, value]) => {
                        const isEditing = state.editingFields?.[key]
                        const correctedValue = state.correctedValues?.[key] || ''

                        return (
                          <div key={key} className="flex items-center gap-2 py-1">
                            <span className="text-xs text-gray-600 capitalize min-w-20">
                              {key}:
                            </span>

                            {isEditing ? (
                              <input
                                type="text"
                                value={correctedValue}
                                onChange={(e) => handleFieldChange(zone.id, key, e.target.value)}
                                className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                                autoFocus
                              />
                            ) : (
                              <span className="flex-1 text-xs text-gray-900 font-medium">
                                {correctedValue}
                              </span>
                            )}

                            <button
                              onClick={() => toggleEditField(zone.id, key)}
                              className="text-gray-400 hover:text-gray-600 text-xs px-1"
                              title={isEditing ? 'Done' : 'Edit'}
                            >
                              {isEditing ? '✓' : '✎'}
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Confirm & Save button */}
                    <button
                      onClick={() => handleConfirmAndSave(zone.id, zone.documentType, state.correctedValues)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Confirm & Save'}
                    </button>
                  </div>
                )}

                {/* Success state */}
                {isSuccess && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-500 text-xl">✓</span>
                      <p className="text-sm font-semibold text-green-700">
                        {zone.label} saved
                      </p>
                    </div>

                    {/* Summary of saved fields */}
                    <div className="space-y-1 text-xs mb-3">
                      {state.extracted && Object.entries(state.extracted).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{key}:</span>
                          <span className="text-gray-900 font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Re-upload button */}
                    <button
                      onClick={() => resetZone(zone.id)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
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

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium transition-all z-50 ${
          toast.type === 'success'
            ? 'bg-green-500 text-white'
            : toast.type === 'warning'
            ? 'bg-amber-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
