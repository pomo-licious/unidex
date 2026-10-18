export const ADMISSIONS_AI_PAGE_LIMITS = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  maxPages: 5,
  maxInputPixels: 24_000_000,
  maxInputDimension: 16_000,
  maxOutputDimension: 2_200,
  minOutputLongEdge: 600,
  minOutputShortEdge: 300,
  maxPageBytes: 3 * 1024 * 1024,
  // Leave room for document IDs, page metadata and JSON syntax within the
  // server's 8 MiB request-body limit.
  maxBase64Bytes: 8 * 1024 * 1024 - 64 * 1024,
  jpegQuality: 0.88,
  timeoutMs: 120_000,
})

const MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const fail = (message, code = 'AI_PREPARATION_FAILED') => Object.assign(new Error(message), { code })
const abortError = () => Object.assign(new Error('Document preparation was cancelled.'), { name: 'AbortError', code: 'AI_PREPARATION_CANCELLED' })
const assetRoot = () => new URL(`${import.meta.env?.BASE_URL || '/'}assets/ocr/v1/pdf/`, globalThis.location?.origin || 'http://localhost').href
const quietly = callback => { try { callback() } catch { /* Release resources without exposing document/runtime errors. */ } }

// Inspect dimensions before decoding, so a small compressed image cannot allocate
// an unbounded bitmap. The browser decoder still validates the complete image.
export function admissionsAiImageDimensions(bytes, mime) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (mime === 'image/png' && bytes.length >= 33
    && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
    && view.getUint32(8) === 13 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR') {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 255) return null
      while (bytes[offset + 1] === 255) offset++
      const marker = bytes[offset + 1]
      if (marker === 218 || marker === 217) break
      if (marker === 1 || marker >= 208 && marker <= 215) { offset += 2; continue }
      if (offset + 4 > bytes.length) return null
      const length = view.getUint16(offset + 2)
      if (length < 2 || offset + 2 + length > bytes.length) return null
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8) return null
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
      }
      offset += length + 2
    }
  }
  if (mime === 'image/webp' && bytes.length >= 30
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    const kind = String.fromCharCode(...bytes.slice(12, 16))
    if (kind === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    if (kind === 'VP8L' && bytes[20] === 47) return { width: 1 + bytes[21] + ((bytes[22] & 63) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10) }
  }
  return null
}

const browserRuntime = {
  async loadPdf() {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = `${assetRoot()}pdf.worker.min.mjs`
    return pdfjs
  },
  pdfOptions() {
    return { cMapUrl: `${assetRoot()}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assetRoot()}standard_fonts/`, wasmUrl: `${assetRoot()}wasm/`, iccUrl: `${assetRoot()}iccs/` }
  },
  canvas(width, height) {
    const canvas = globalThis.document.createElement('canvas')
    canvas.width = width; canvas.height = height
    return canvas
  },
  async image(blob) {
    if (typeof globalThis.createImageBitmap !== 'function') throw fail('Your browser cannot prepare this image. Try a current Chrome, Edge, Firefox or Safari browser.', 'AI_PREPARATION_UNSUPPORTED')
    return globalThis.createImageBitmap(blob, { imageOrientation: 'from-image' })
  },
  encodeJpeg(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(fail('This document image could not be prepared. Try a clearer copy.')), 'image/jpeg', quality))
  },
}

function outputSize(width, height, allowUpscale = false) {
  if (!(width > 0 && height > 0) || !Number.isFinite(width * height)) throw fail('This document has invalid page dimensions.', 'AI_PREPARATION_INVALID_FILE')
  const scale = Math.min(allowUpscale ? Infinity : 1, ADMISSIONS_AI_PAGE_LIMITS.maxOutputDimension / Math.max(width, height))
  const size = { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale }
  if (Math.max(size.width, size.height) < ADMISSIONS_AI_PAGE_LIMITS.minOutputLongEdge || Math.min(size.width, size.height) < ADMISSIONS_AI_PAGE_LIMITS.minOutputShortEdge) {
    throw fail('This document is too small or narrow to read reliably. Upload a sharper image or crop its relevant page before trying again.', 'AI_PREPARATION_LOW_RESOLUTION')
  }
  return size
}

function validateImageSize(dimensions) {
  if (!dimensions?.width || !dimensions?.height || !Number.isFinite(dimensions.width * dimensions.height)) throw fail('Upload a valid JPG, PNG or WebP document image.', 'AI_PREPARATION_INVALID_FILE')
  if (dimensions.width * dimensions.height > ADMISSIONS_AI_PAGE_LIMITS.maxInputPixels || Math.max(dimensions.width, dimensions.height) > ADMISSIONS_AI_PAGE_LIMITS.maxInputDimension) {
    throw fail('This image is too large to prepare safely. Resize it below 24 megapixels and 16,000 pixels per edge, then try again.', 'AI_PREPARATION_IMAGE_TOO_LARGE')
  }
}

function base64FromBytes(bytes) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return globalThis.btoa(binary)
}

// This seam tests page preparation and resource ownership without installing or
// launching a browser. It contains no text extraction or OCR inference.
export function createAdmissionsAiPagePreparer(runtime = browserRuntime) {
  return async function prepare(blob, document, { signal, onProgress = () => {} } = {}) {
    if (document?.document_type === 'photo') throw fail('Profile photos are applied directly and are not sent to AI document extraction.', 'PHOTO_EXTRACTION_DISABLED')
    const mime = document?.mime_type || blob?.type
    if (!blob || typeof blob.arrayBuffer !== 'function' || !Number.isFinite(blob.size) || blob.size < 1 || blob.size > ADMISSIONS_AI_PAGE_LIMITS.maxBytes
      || !MIME_TYPES.has(mime) || blob.type && blob.type !== mime) {
      throw fail('Choose a PDF, JPG, PNG or WebP document up to 10 MB.', 'AI_PREPARATION_INVALID_FILE')
    }
    if (signal?.aborted) throw abortError()
    let pdfTask, renderTask, canvas, bitmap, destroyPromise, closed = false, cancellationReject, timeout
    let totalPages = 1, pageNumber = 1, lastProgress = 0, payloadBytes = 0
    const pages = []
    const cancellation = new Promise((_, reject) => { cancellationReject = reject })
    const check = () => { if (closed || signal?.aborted) throw abortError() }
    const report = (stage, progress, message) => {
      check()
      lastProgress = Math.max(lastProgress, Math.min(1, Number(progress) || 0))
      onProgress({ stage, progress: lastProgress, page: pageNumber, totalPages, message })
    }
    const releaseCanvas = () => {
      if (canvas) { const current = canvas; canvas = null; quietly(() => { current.width = 1; current.height = 1 }) }
    }
    const closeBitmap = () => { if (bitmap) { const current = bitmap; bitmap = null; quietly(() => current.close?.()) } }
    const terminate = () => {
      if (renderTask) { const current = renderTask; renderTask = null; quietly(() => current.cancel()) }
      if (pdfTask) {
        const current = pdfTask; pdfTask = null
        try { destroyPromise = Promise.resolve(current.destroy()).catch(() => {}) } catch { /* Already destroyed. */ }
      }
      closeBitmap()
      releaseCanvas()
    }
    const interrupt = error => {
      if (closed) return
      closed = true
      cancellationReject(error)
      terminate()
    }
    const cancel = () => interrupt(abortError())
    signal?.addEventListener('abort', cancel, { once: true })
    timeout = setTimeout(() => interrupt(fail('Preparing this document took too long. Try a shorter PDF or a clearer image.', 'AI_PREPARATION_TIMEOUT')), ADMISSIONS_AI_PAGE_LIMITS.timeoutMs)
    const encodePage = async () => {
      check()
      report('preparing', 0.1 + 0.8 * ((pageNumber - 0.2) / totalPages), `Preparing page ${pageNumber} of ${totalPages} for AI…`)
      const encoded = await runtime.encodeJpeg(canvas, ADMISSIONS_AI_PAGE_LIMITS.jpegQuality)
      check()
      if (!encoded || encoded.type !== 'image/jpeg' || !Number.isFinite(encoded.size) || encoded.size < 3 || encoded.size > ADMISSIONS_AI_PAGE_LIMITS.maxPageBytes) {
        throw fail('This page is too complex to send clearly. Upload a cropped or smaller copy; no unreadable compressed version has been sent.', 'AI_PREPARATION_PAGE_TOO_LARGE')
      }
      const bytes = new Uint8Array(await encoded.arrayBuffer())
      check()
      if (bytes.length !== encoded.size || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw fail('The document image could not be prepared. Try another copy.', 'AI_PREPARATION_INVALID_FILE')
      const encodedLength = 4 * Math.ceil(bytes.length / 3)
      if (payloadBytes + encodedLength > ADMISSIONS_AI_PAGE_LIMITS.maxBase64Bytes) throw fail('These pages exceed the AI request limit. Split the PDF into smaller documents and try again.', 'AI_PREPARATION_PAYLOAD_TOO_LARGE')
      const data = base64FromBytes(bytes)
      payloadBytes += data.length
      pages.push({ page_number: pageNumber, mime_type: 'image/jpeg', data_base64: data })
      releaseCanvas()
    }
    const run = async () => {
      report('loading', 0, 'Preparing document pages for AI…')
      const bytes = new Uint8Array(await blob.arrayBuffer())
      check()
      if (bytes.length !== blob.size) throw fail('This document could not be loaded completely. Try uploading it again.', 'AI_PREPARATION_INVALID_FILE')
      if (mime === 'application/pdf') {
        if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') throw fail('Upload a valid PDF document.', 'AI_PREPARATION_INVALID_FILE')
        const pdfjs = await runtime.loadPdf()
        check()
        pdfTask = pdfjs.getDocument({ ...runtime.pdfOptions(), data: bytes, isEvalSupported: false, enableXfa: false, stopAtErrors: true, maxImageSize: ADMISSIONS_AI_PAGE_LIMITS.maxInputPixels, canvasMaxAreaInBytes: ADMISSIONS_AI_PAGE_LIMITS.maxOutputDimension ** 2 * 4 })
        pdfTask.onPassword = () => interrupt(fail('Upload an unlocked PDF so AI can read its pages.', 'AI_PREPARATION_PASSWORD_REQUIRED'))
        const pdf = await pdfTask.promise
        check()
        totalPages = pdf.numPages
        if (!Number.isInteger(totalPages) || totalPages < 1) throw fail('This PDF has no readable pages.', 'AI_PREPARATION_INVALID_FILE')
        if (totalPages > ADMISSIONS_AI_PAGE_LIMITS.maxPages) throw fail(`This PDF has ${totalPages} pages. Upload documents of up to ${ADMISSIONS_AI_PAGE_LIMITS.maxPages} pages each so every page can be read. No pages from this file have been sent.`, 'AI_PREPARATION_TOO_MANY_PAGES')
        for (pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
          check()
          report('preparing', 0.1 + 0.8 * ((pageNumber - 1) / totalPages), `Preparing page ${pageNumber} of ${totalPages} for AI…`)
          const pdfPage = await pdf.getPage(pageNumber)
          try {
            check()
            const natural = pdfPage.getViewport({ scale: 1 })
            const size = outputSize(natural.width, natural.height, true)
            const viewport = pdfPage.getViewport({ scale: size.scale })
            canvas = runtime.canvas(size.width, size.height)
            const context = canvas.getContext('2d', { alpha: false })
            if (!context) throw fail('Your browser could not prepare this PDF page. Try a current browser.', 'AI_PREPARATION_UNSUPPORTED')
            renderTask = pdfPage.render({ canvasContext: context, viewport, background: '#ffffff' })
            await renderTask.promise
            check()
            renderTask = null
            await encodePage()
          } finally { quietly(() => pdfPage.cleanup()) }
        }
        pageNumber = totalPages
      } else {
        const dimensions = admissionsAiImageDimensions(bytes, mime)
        validateImageSize(dimensions)
        outputSize(dimensions.width, dimensions.height)
        const decoded = await runtime.image(blob)
        if (closed || signal?.aborted) { quietly(() => decoded.close?.()); check() }
        bitmap = decoded
        check()
        validateImageSize(bitmap)
        const size = outputSize(bitmap.width, bitmap.height)
        canvas = runtime.canvas(size.width, size.height)
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw fail('Your browser could not prepare this document image. Try a current browser.', 'AI_PREPARATION_UNSUPPORTED')
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height)
        context.drawImage(bitmap, 0, 0, size.width, size.height)
        closeBitmap()
        await encodePage()
      }
      check()
      report('complete', 1, 'Document pages are ready for AI extraction.')
      return { pages, total_pages: totalPages }
    }
    try { return await Promise.race([run(), cancellation]) }
    catch (error) {
      pages.length = 0
      if (error?.code?.startsWith('AI_PREPARATION_') || error?.code === 'PHOTO_EXTRACTION_DISABLED' || error?.name === 'AbortError') throw error
      if (error?.name === 'PasswordException') throw fail('Upload an unlocked PDF so AI can read its pages.', 'AI_PREPARATION_PASSWORD_REQUIRED')
      throw fail('This document could not be prepared for AI. Check your connection and try a clearer PDF or image.')
    } finally {
      closed = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', cancel)
      terminate()
      await destroyPromise
    }
  }
}

export const prepareAdmissionsAiPages = createAdmissionsAiPagePreparer()
