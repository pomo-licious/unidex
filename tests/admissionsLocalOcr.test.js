import { describe, expect, it, vi } from 'vitest'
import { createLocalAdmissionsExtractor, imageDimensions, LOCAL_OCR_LIMITS, pdfTextLines } from '../src/lib/admissionsLocalOcr.js'

const png = (width = 100, height = 100) => {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width); view.setUint32(20, height)
  return new Blob([bytes], { type: 'image/png' })
}
const pdf = () => new Blob(['%PDF-1.7\nSynthetic fixture'], { type: 'application/pdf' })
const document = { document_type: 'academic_10th', mime_type: 'image/png' }
const textItems = text => text.split('\n').map((str, i) => ({ str, transform: [1, 0, 0, 1, 10, 100 - i * 20] }))
const facts = 'Name: Synthetic Applicant\nBoard: CBSE\nPercentage: 91.4%'
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

function harness(overrides = {}) {
  const worker = { setParameters: vi.fn(async () => {}), recognize: vi.fn(async () => ({ data: { text: facts, confidence: 90 } })), terminate: vi.fn(async () => {}) }
  const image = { width: 100, height: 100, close: vi.fn() }
  const canvas = { width: 100, height: 100, getContext: () => ({ fillRect() {}, drawImage() {} }) }
  const cleanup = vi.fn()
  const renderCancel = vi.fn()
  const page = { getTextContent: vi.fn(async () => ({ items: textItems(facts) })), cleanup, getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }), render: vi.fn(() => ({ promise: Promise.resolve(), cancel: renderCancel })) }
  const pdfDocument = { numPages: 1, getPage: vi.fn(async () => page) }
  const pdfTask = { promise: Promise.resolve(pdfDocument), destroy: vi.fn(async () => {}) }
  const runtime = { loadPdf: vi.fn(async () => ({ getDocument: vi.fn(() => pdfTask) })), createOcr: vi.fn(async () => worker), canvas: vi.fn(() => canvas), image: vi.fn(async () => image), ocrInput: async value => value, pdfOptions: () => ({}), ...overrides }
  return { runtime, worker, image, canvas, page, pdfDocument, pdfTask, cleanup, renderCancel, extract: createLocalAdmissionsExtractor(runtime) }
}

describe('Bounded local OCR orchestration', () => {
  it('uses actual PDF text instead of loading an OCR worker unnecessarily', async () => {
    const test = harness()
    await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(test.runtime.createOcr).not.toHaveBeenCalled()
  })
  it('returns whitelisted structured facts from text PDF content', async () => {
    const test = harness()
    const result = await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(result.extracted_data).toEqual({ full_name: 'Synthetic Applicant', academic_10th: { board: 'CBSE', percentage: 91.4 } })
  })
  it('renders and OCRs a PDF with no readable text layer', async () => {
    const test = harness(); test.page.getTextContent.mockResolvedValue({ items: [] })
    await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(test.worker.recognize).toHaveBeenCalledOnce()
  })
  it('reuses one OCR worker across scanned PDF pages', async () => {
    const test = harness(); test.page.getTextContent.mockResolvedValue({ items: [] }); test.pdfDocument.numPages = 3
    await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(test.runtime.createOcr).toHaveBeenCalledOnce()
  })
  it('cleans each PDF page after reading', async () => {
    const test = harness(); test.pdfDocument.numPages = 3
    await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(test.cleanup).toHaveBeenCalledTimes(3)
  })
  it('stops processing at five PDF pages', async () => {
    const test = harness(); test.pdfDocument.numPages = 8
    await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(test.pdfDocument.getPage).toHaveBeenCalledTimes(5)
  })
  it('reports the entire PDF page count and conspicuous partial warning', async () => {
    const test = harness(); test.pdfDocument.numPages = 8
    const result = await test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    expect(result.diagnostics).toMatchObject({ pages_processed: 5, total_pages: 8, warnings: expect.arrayContaining([expect.stringMatching(/first 5 of 8/)]), methods: ['pdf_text'] })
  })
  it('never accepts a profile photograph for OCR', async () => {
    const test = harness()
    await expect(test.extract(png(), { ...document, document_type: 'photo' })).rejects.toMatchObject({ code: 'PHOTO_EXTRACTION_DISABLED' })
  })
  it('rejects an oversized image before decoding any pixels', async () => {
    const test = harness()
    await expect(test.extract(png(10000, 10000), document)).rejects.toMatchObject({ code: 'LOCAL_OCR_IMAGE_TOO_LARGE' })
  })
  it('does not instantiate a decoder for an oversized image', async () => {
    const test = harness()
    try { await test.extract(png(10000, 10000), document) } catch { /* expected */ }
    expect(test.runtime.image).not.toHaveBeenCalled()
  })
  it('rejects a fake image signature', async () => {
    const test = harness()
    await expect(test.extract(new Blob(['not an image']), document)).rejects.toMatchObject({ code: 'LOCAL_OCR_INVALID_FILE' })
  })
  it('rejects a fake PDF signature', async () => {
    const test = harness()
    await expect(test.extract(new Blob(['not a PDF']), { ...document, mime_type: 'application/pdf' })).rejects.toMatchObject({ code: 'LOCAL_OCR_INVALID_FILE' })
  })
  it('rejects files above the upload limit', async () => {
    const test = harness()
    await expect(test.extract({ size: LOCAL_OCR_LIMITS.maxBytes + 1, arrayBuffer() {} }, document)).rejects.toMatchObject({ code: 'LOCAL_OCR_INVALID_FILE' })
  })
  it('does not expose OCR raw text or confidence in its result', async () => {
    const test = harness()
    expect(Object.keys(await test.extract(png(), document)).sort()).toEqual(['diagnostics', 'extracted_data', 'extraction_model'])
  })
  it('terminates the OCR worker after successful image recognition', async () => {
    const test = harness(); await test.extract(png(), document)
    expect(test.worker.terminate).toHaveBeenCalledOnce()
  })
  it('closes decoded images after drawing', async () => {
    const test = harness(); await test.extract(png(), document)
    expect(test.image.close).toHaveBeenCalledOnce()
  })
  it('releases canvas pixels after completion', async () => {
    const test = harness(); await test.extract(png(), document)
    expect([test.canvas.width, test.canvas.height]).toEqual([1, 1])
  })
  it('terminates the OCR worker on recognition failure', async () => {
    const test = harness(); test.worker.recognize.mockRejectedValue(new Error('private raw data'))
    try { await test.extract(png(), document) } catch { /* expected */ }
    expect(test.worker.terminate).toHaveBeenCalledOnce()
  })
  it('does not expose runtime errors containing document content', async () => {
    const test = harness(); test.worker.recognize.mockRejectedValue(new Error('private raw data'))
    await expect(test.extract(png(), document)).rejects.not.toThrow('private raw data')
  })
  it('rejects a document without any structured facts', async () => {
    const test = harness(); test.worker.recognize.mockResolvedValue({ data: { text: 'Unreadable handwriting with no labelled profile facts' } })
    await expect(test.extract(png(), document)).rejects.toMatchObject({ code: 'LOCAL_OCR_NO_FIELDS' })
  })
  it('preserves identity category restrictions after image recognition', async () => {
    const test = harness(); test.worker.recognize.mockResolvedValue({ data: { text: 'Name: Synthetic Applicant\nPhone: 9876543210\nPercentage: 99\nAadhaar: 1234 5678 9012' } })
    const result = await test.extract(png(), { ...document, document_type: 'aadhaar_card' })
    expect(result.extracted_data).toEqual({ full_name: 'Synthetic Applicant' })
  })
  it('reports monotonic progress ending at one', async () => {
    const test = harness(), progress = []
    await test.extract(png(), document, { onProgress: event => progress.push(event.progress) })
    expect(progress).toEqual([...progress].sort((a, b) => a - b).map(value => Math.min(value, 1)))
  })
  it('includes a specific low-quality page warning', async () => {
    const test = harness(); test.worker.recognize.mockResolvedValue({ data: { text: facts, confidence: 40 } })
    const result = await test.extract(png(), document)
    expect(result.diagnostics.warnings).toContain('Page 1 was difficult to read. Check its extracted values carefully.')
  })
  it('cancels immediately before reading an already-aborted request', async () => {
    const test = harness(), controller = new AbortController(); controller.abort()
    await expect(test.extract(png(), document, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('terminates an active worker when cancelled', async () => {
    const test = harness(), gate = deferred(), started = deferred(), controller = new AbortController()
    test.worker.recognize.mockImplementation(() => { started.resolve(); return gate.promise })
    const run = test.extract(png(), document, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    expect(test.worker.terminate).toHaveBeenCalledOnce()
  })
  it('cleans a late-created worker after cancellation during initial loading', async () => {
    const gate = deferred(), started = deferred(), test = harness(), controller = new AbortController()
    test.runtime.createOcr.mockImplementation(() => { started.resolve(); return gate.promise })
    const run = test.extract(png(), document, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(test.worker); await new Promise(resolve => setTimeout(resolve, 0))
    expect(test.worker.terminate).toHaveBeenCalledOnce()
  })
  it('closes a late-decoded image after cancellation', async () => {
    const gate = deferred(), started = deferred(), test = harness(), controller = new AbortController()
    test.runtime.image.mockImplementation(() => { started.resolve(); return gate.promise })
    const run = test.extract(png(), document, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(test.image); await new Promise(resolve => setTimeout(resolve, 0))
    expect(test.image.close).toHaveBeenCalledOnce()
  })
  it('returns a typed error for locked PDFs', async () => {
    const test = harness(), gate = deferred()
    test.pdfTask.promise = gate.promise
    const run = test.extract(pdf(), { ...document, mime_type: 'application/pdf' })
    await new Promise(resolve => setTimeout(resolve, 0)); test.pdfTask.onPassword()
    await expect(run).rejects.toMatchObject({ code: 'LOCAL_OCR_PASSWORD_REQUIRED' })
  })
})

describe('Document metadata and PDF text layout', () => {
  it('reads PNG dimensions before pixel allocation', async () => expect(imageDimensions(new Uint8Array(await png(20, 30).arrayBuffer()), 'image/png')).toEqual({ width: 20, height: 30 }))
  it('keeps label fragments on the same geometric line', () => expect(pdfTextLines([{ str: 'Name:', transform: [1, 0, 0, 1, 0, 100] }, { str: 'Asha Mehta', transform: [1, 0, 0, 1, 80, 100] }])).toBe('Name: Asha Mehta'))
  it('keeps vertically distinct values on separate lines', () => expect(pdfTextLines(textItems('Name:\nAsha Mehta'))).toBe('Name:\nAsha Mehta'))
})
