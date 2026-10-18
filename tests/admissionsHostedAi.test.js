import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADMISSIONS_AI_PAGE_LIMITS, admissionsAiImageDimensions, createAdmissionsAiPagePreparer } from '../src/lib/admissionsHostedAi.js'

const pdfFile = () => new Blob(['%PDF-1.7\nSynthetic applicant fixture'], { type: 'application/pdf' })
const pngFile = (width = 1200, height = 1600) => {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width); view.setUint32(20, height)
  return new Blob([bytes], { type: 'image/png' })
}
const jpegFile = (size = 4, page = 1) => {
  const bytes = new Uint8Array(size)
  bytes.set([255, 216, 255, page])
  return new Blob([bytes], { type: 'image/jpeg' })
}
const record = { document_type: 'academic_12th', mime_type: 'image/png' }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function harness({ pageCount = 1, ...overrides } = {}) {
  const canvases = []
  const image = { width: 1200, height: 1600, close: vi.fn() }
  const pdfPages = Array.from({ length: pageCount }, (_, index) => ({
    getTextContent: vi.fn(() => { throw new Error('Text extraction must never run') }),
    getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
    cleanup: vi.fn(),
    render: vi.fn(({ canvasContext }) => {
      canvasContext.canvas.pageNumber = index + 1
      return { promise: Promise.resolve(), cancel: vi.fn() }
    }),
  }))
  const pdf = { numPages: pageCount, getPage: vi.fn(async number => pdfPages[number - 1]) }
  const pdfTask = { promise: Promise.resolve(pdf), destroy: vi.fn(async () => {}) }
  const getDocument = vi.fn(() => pdfTask)
  const runtime = {
    loadPdf: vi.fn(async () => ({ getDocument })),
    pdfOptions: () => ({}),
    image: vi.fn(async () => image),
    canvas: vi.fn((width, height) => {
      const canvas = { width, height }
      canvas.context = { canvas, fillRect: vi.fn(), drawImage: vi.fn() }
      canvas.getContext = vi.fn(() => canvas.context)
      canvases.push(canvas)
      return canvas
    }),
    encodeJpeg: vi.fn(async canvas => jpegFile(4, canvas.pageNumber || 1)),
    ...overrides,
  }
  return { runtime, image, canvases, pdf, pdfTask, pdfPages, getDocument, prepare: createAdmissionsAiPagePreparer(runtime) }
}

afterEach(() => vi.useRealTimers())

describe('Hosted AI page preparation', () => {
  it('returns a single JPEG page without running local OCR', async () => {
    const test = harness()
    expect(await test.prepare(pngFile(), record)).toEqual({ total_pages: 1, pages: [{ page_number: 1, mime_type: 'image/jpeg', data_base64: '/9j/AQ==' }] })
  })
  it('does not load PDF.js for an image', async () => {
    const test = harness(); await test.prepare(pngFile(), record)
    expect(test.runtime.loadPdf).not.toHaveBeenCalled()
  })
  it('renders all five PDF pages in their original order', async () => {
    const test = harness({ pageCount: 5 })
    const result = await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(result.pages.map(page => [page.page_number, atob(page.data_base64).charCodeAt(3)])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]])
  })
  it('uses vision images even for PDFs that have a text layer', async () => {
    const test = harness(); await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(test.pdfPages[0].getTextContent).not.toHaveBeenCalled()
  })
  it('rejects a six-page PDF rather than extracting only its first five pages', async () => {
    const test = harness({ pageCount: 6 })
    await expect(test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })).rejects.toMatchObject({ code: 'AI_PREPARATION_TOO_MANY_PAGES', message: expect.stringContaining('No pages from this file have been sent') })
  })
  it('does not render or encode any part of an over-limit PDF', async () => {
    const test = harness({ pageCount: 6 })
    try { await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }) } catch { /* Expected refusal. */ }
    expect([test.pdf.getPage.mock.calls.length, test.runtime.encodeJpeg.mock.calls.length]).toEqual([0, 0])
  })
  it('rejects PDFs with an invalid page count', async () => {
    const test = harness(); test.pdf.numPages = 0
    await expect(test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })).rejects.toMatchObject({ code: 'AI_PREPARATION_INVALID_FILE' })
  })
  it('bounds rendered PDF dimensions at 2200 pixels', async () => {
    const test = harness(); await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(test.runtime.canvas.mock.calls[0]).toEqual([1700, 2200])
  })
  it('downsamples a large image once while preserving readable page dimensions', async () => {
    const test = harness(); test.image.width = 3000; test.image.height = 4000
    await test.prepare(pngFile(3000, 4000), record)
    expect(test.runtime.canvas.mock.calls[0]).toEqual([1650, 2200])
  })
  it('keeps a readable smaller image at its original resolution', async () => {
    const test = harness(); await test.prepare(pngFile(), record)
    expect(test.runtime.canvas.mock.calls[0]).toEqual([1200, 1600])
  })
  it('encodes at a fixed readable JPEG quality without repeated degradation', async () => {
    const test = harness(); await test.prepare(pngFile(), record)
    expect(test.runtime.encodeJpeg.mock.calls.map(call => call[1])).toEqual([0.88])
  })
  it('rejects a tiny image before decoding', async () => {
    const test = harness()
    await expect(test.prepare(pngFile(200, 300), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_LOW_RESOLUTION' })
  })
  it('refuses a narrow page that would become unreadable after resizing', async () => {
    const test = harness()
    await expect(test.prepare(pngFile(400, 10000), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_LOW_RESOLUTION' })
  })
  it('rejects oversized compressed images before pixel allocation', async () => {
    const test = harness()
    try { await test.prepare(pngFile(10000, 10000), record) } catch { /* Expected refusal. */ }
    expect(test.runtime.image).not.toHaveBeenCalled()
  })
  it('checks decoded dimensions as well as the file header', async () => {
    const test = harness(); test.image.width = 10000; test.image.height = 10000
    await expect(test.prepare(pngFile(), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_IMAGE_TOO_LARGE' })
  })
  it('never sends a profile photograph to document extraction', async () => {
    const test = harness()
    await expect(test.prepare(pngFile(), { ...record, document_type: 'photo' })).rejects.toMatchObject({ code: 'PHOTO_EXTRACTION_DISABLED' })
  })
  it('rejects original documents larger than 10 MB without reading them', async () => {
    const test = harness(), arrayBuffer = vi.fn()
    try { await test.prepare({ size: ADMISSIONS_AI_PAGE_LIMITS.maxBytes + 1, arrayBuffer }, record) } catch { /* Expected refusal. */ }
    expect(arrayBuffer).not.toHaveBeenCalled()
  })
  it('rejects a mismatched blob MIME type', async () => {
    const test = harness()
    await expect(test.prepare(pngFile(), { ...record, mime_type: 'application/pdf' })).rejects.toMatchObject({ code: 'AI_PREPARATION_INVALID_FILE' })
  })
  it('rejects spoofed PDF bytes before loading PDF.js', async () => {
    const test = harness()
    try { await test.prepare(new Blob(['private spoofed data'], { type: 'application/pdf' }), { ...record, mime_type: 'application/pdf' }) } catch { /* Expected refusal. */ }
    expect(test.runtime.loadPdf).not.toHaveBeenCalled()
  })
  it('rejects spoofed image bytes before decoding', async () => {
    const test = harness()
    await expect(test.prepare(new Blob(['private spoofed data'], { type: 'image/png' }), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_INVALID_FILE' })
  })
  it('refuses a JPEG page larger than 3 MB rather than shrinking it until unreadable', async () => {
    const test = harness({ encodeJpeg: vi.fn(async () => jpegFile(ADMISSIONS_AI_PAGE_LIMITS.maxPageBytes + 1)) })
    await expect(test.prepare(pngFile(), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_PAGE_TOO_LARGE' })
  })
  it('counts the base64 expansion toward the total request limit', async () => {
    const test = harness({ pageCount: 3, encodeJpeg: vi.fn(async () => jpegFile(ADMISSIONS_AI_PAGE_LIMITS.maxPageBytes)) })
    await expect(test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })).rejects.toMatchObject({ code: 'AI_PREPARATION_PAYLOAD_TOO_LARGE' })
  })
  it('reserves space for JSON metadata within the server request limit', async () => {
    const size = Math.floor(ADMISSIONS_AI_PAGE_LIMITS.maxBase64Bytes / 8) * 3
    const test = harness({ pageCount: 2, encodeJpeg: vi.fn(async () => jpegFile(size)) })
    const result = await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(new Blob([JSON.stringify({ document_id: '00000000-0000-4000-8000-000000000001', ...result })]).size).toBeLessThan(8 * 1024 * 1024)
  })
  it('rejects an encoder that returns a non-JPEG signature', async () => {
    const test = harness({ encodeJpeg: vi.fn(async () => new Blob(['wrong bytes'], { type: 'image/jpeg' })) })
    await expect(test.prepare(pngFile(), record)).rejects.toMatchObject({ code: 'AI_PREPARATION_INVALID_FILE' })
  })
  it('releases every canvas after successful PDF preparation', async () => {
    const test = harness({ pageCount: 5 }); await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(test.canvases.map(canvas => [canvas.width, canvas.height])).toEqual(Array(5).fill([1, 1]))
  })
  it('cleans every rendered PDF page', async () => {
    const test = harness({ pageCount: 5 }); await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(test.pdfPages.map(page => page.cleanup.mock.calls.length)).toEqual([1, 1, 1, 1, 1])
  })
  it('destroys the PDF worker exactly once on success', async () => {
    const test = harness(); await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    expect(test.pdfTask.destroy).toHaveBeenCalledOnce()
  })
  it('destroys the PDF worker when a PDF is rejected for excess pages', async () => {
    const test = harness({ pageCount: 6 })
    try { await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }) } catch { /* Expected refusal. */ }
    expect(test.pdfTask.destroy).toHaveBeenCalledOnce()
  })
  it('closes decoded image pixels after drawing them', async () => {
    const test = harness(); await test.prepare(pngFile(), record)
    expect(test.image.close).toHaveBeenCalledOnce()
  })
  it('closes a decoded image when its dimensions are unsafe', async () => {
    const test = harness(); test.image.width = 10000; test.image.height = 10000
    try { await test.prepare(pngFile(), record) } catch { /* Expected refusal. */ }
    expect(test.image.close).toHaveBeenCalledOnce()
  })
  it('releases canvas pixels even when JPEG encoding fails', async () => {
    const test = harness({ encodeJpeg: vi.fn(async () => { throw new Error('private encoder data') }) })
    try { await test.prepare(pngFile(), record) } catch { /* Expected refusal. */ }
    expect(test.canvases.map(canvas => [canvas.width, canvas.height])).toEqual([[1, 1]])
  })
  it('does not expose decoder error messages containing private document content', async () => {
    const test = harness({ image: vi.fn(async () => { throw new Error('private applicant identity and marks') }) })
    await expect(test.prepare(pngFile(), record)).rejects.not.toThrow('private applicant identity')
  })
  it('reports monotonic progress that completes at one', async () => {
    const test = harness({ pageCount: 5 }), progress = []
    await test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }, { onProgress: event => progress.push(event.progress) })
    expect(progress).toEqual([...progress].sort((a, b) => a - b).filter(value => value >= 0 && value <= 1).map((value, index, all) => index === all.length - 1 ? 1 : value))
  })
  it('honors cancellation before reading any document bytes', async () => {
    const test = harness(), controller = new AbortController(); controller.abort()
    await expect(test.prepare(pngFile(), record, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('closes a bitmap that finishes decoding after cancellation', async () => {
    const gate = deferred(), started = deferred(), controller = new AbortController()
    const test = harness({ image: vi.fn(() => { started.resolve(); return gate.promise }) })
    const run = test.prepare(pngFile(), record, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(test.image); await settle()
    expect(test.image.close).toHaveBeenCalledOnce()
  })
  it('does not create a PDF worker when cancelled during module loading', async () => {
    const gate = deferred(), started = deferred(), controller = new AbortController(), test = harness()
    test.runtime.loadPdf.mockImplementation(() => { started.resolve(); return gate.promise })
    const run = test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve({ getDocument: test.getDocument }); await settle()
    expect(test.getDocument).not.toHaveBeenCalled()
  })
  it('cancels an active PDF render and destroys its worker', async () => {
    const test = harness(), gate = deferred(), started = deferred(), controller = new AbortController()
    const cancel = vi.fn(() => gate.reject(new Error('Rendering cancelled')))
    test.pdfPages[0].render.mockImplementation(() => { started.resolve(); return { promise: gate.promise, cancel } })
    const run = test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    expect([cancel.mock.calls.length, test.pdfTask.destroy.mock.calls.length]).toEqual([1, 1])
  })
  it('cleans a PDF page that arrives after cancellation', async () => {
    const test = harness(), gate = deferred(), started = deferred(), controller = new AbortController()
    test.pdf.getPage.mockImplementation(() => { started.resolve(); return gate.promise })
    const run = test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(test.pdfPages[0]); await settle()
    expect(test.pdfPages[0].cleanup).toHaveBeenCalledOnce()
  })
  it('does not encode another page after cancellation during image encoding', async () => {
    const gate = deferred(), started = deferred(), controller = new AbortController()
    const test = harness({ pageCount: 2, encodeJpeg: vi.fn(() => { started.resolve(); return gate.promise }) })
    const run = test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' }, { signal: controller.signal })
    await started.promise; controller.abort(); await expect(run).rejects.toMatchObject({ name: 'AbortError' })
    gate.resolve(jpegFile()); await settle()
    expect(test.pdf.getPage).toHaveBeenCalledTimes(1)
  })
  it('returns a safe message for a password-protected PDF', async () => {
    const test = harness(), gate = deferred(), started = deferred()
    test.pdfTask.promise = gate.promise
    test.getDocument.mockImplementation(() => { started.resolve(); return test.pdfTask })
    const run = test.prepare(pdfFile(), { ...record, mime_type: 'application/pdf' })
    await started.promise; test.pdfTask.onPassword()
    await expect(run).rejects.toMatchObject({ code: 'AI_PREPARATION_PASSWORD_REQUIRED' })
  })
  it('bounds preparation time and releases an active canvas on timeout', async () => {
    vi.useFakeTimers()
    const gate = deferred(), started = deferred()
    const test = harness({ encodeJpeg: vi.fn(() => { started.resolve(); return gate.promise }) })
    const run = test.prepare(pngFile(), record)
    const rejected = expect(run).rejects.toMatchObject({ code: 'AI_PREPARATION_TIMEOUT' })
    await started.promise; await vi.advanceTimersByTimeAsync(ADMISSIONS_AI_PAGE_LIMITS.timeoutMs); await rejected
    expect(test.canvases.map(canvas => [canvas.width, canvas.height])).toEqual([[1, 1]])
  })
})

describe('Hosted AI image header validation', () => {
  it('recognizes complete PNG headers before image allocation', async () => expect(admissionsAiImageDimensions(new Uint8Array(await pngFile(1200, 1600).arrayBuffer()), 'image/png')).toEqual({ width: 1200, height: 1600 }))
  it('does not accept an abbreviated or forged PNG signature', () => expect(admissionsAiImageDimensions(new Uint8Array([137, 80, 78, 71]), 'image/png')).toBeNull())
  it('recognizes bounded JPEG SOF dimensions', () => expect(admissionsAiImageDimensions(new Uint8Array([255, 216, 255, 192, 0, 8, 8, 6, 64, 4, 176, 1]), 'image/jpeg')).toEqual({ width: 1200, height: 1600 }))
  it('rejects truncated JPEG segments safely', () => expect(admissionsAiImageDimensions(new Uint8Array([255, 216, 255, 192, 255, 255, 8]), 'image/jpeg')).toBeNull())
  it('recognizes WebP extended dimensions', () => {
    const bytes = new Uint8Array(30)
    bytes.set([82, 73, 70, 70, 22, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88])
    bytes[24] = 175; bytes[25] = 4; bytes[27] = 63; bytes[28] = 6
    expect(admissionsAiImageDimensions(bytes, 'image/webp')).toEqual({ width: 1200, height: 1600 })
  })
})
