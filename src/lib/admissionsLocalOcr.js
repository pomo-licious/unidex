import { parseLocalAdmissionsText } from './admissionsLocalOcrParser.js'
import { sanitizeLocalAdmissionsExtraction } from './admissionsLocalExtraction.js'

export const LOCAL_OCR_MODEL = 'local:tesseract-7.0.0+pdfjs-6.4.299'
export const LOCAL_OCR_LIMITS = Object.freeze({ maxPages: 5, maxOcrPixels: 4_000_000, maxImagePixels: 24_000_000, maxBytes: 10 * 1024 * 1024, timeoutMs: 180_000 })
const MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
const assetRoot = () => new URL(`${import.meta.env?.BASE_URL || '/'}assets/ocr/v1/`, globalThis.location?.origin || 'http://localhost').href
const fail = (message, code = 'LOCAL_OCR_FAILED') => Object.assign(new Error(message), { code })
const abortError = () => Object.assign(new Error('Document extraction was cancelled.'), { name: 'AbortError', code: 'LOCAL_OCR_CANCELLED' })
const ignore = promise => Promise.resolve(promise).catch(() => {})

export function imageDimensions(bytes, mime) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (mime === 'image/png' && bytes.length >= 24 && bytes[0] === 137 && String.fromCharCode(...bytes.slice(1, 4)) === 'PNG') return { width: view.getUint32(16), height: view.getUint32(20) }
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 255) { offset++; continue }
      const marker = bytes[offset + 1]
      if (marker === 218 || marker === 217) break
      if (marker === 0 || marker === 255 || marker >= 208 && marker <= 215) { offset += 2; continue }
      const length = view.getUint16(offset + 2)
      if (length < 2) break
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
      offset += length + 2
    }
  }
  if (mime === 'image/webp' && bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    const kind = String.fromCharCode(...bytes.slice(12, 16))
    if (kind === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    if (kind === 'VP8L' && bytes[20] === 47) return { width: 1 + bytes[21] + ((bytes[22] & 63) << 8), height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10) }
  }
  return null
}

export function pdfTextLines(items = []) {
  const rows = []
  for (const item of items) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue
    const y = Array.isArray(item.transform) ? Number(item.transform[5]) : NaN
    const x = Array.isArray(item.transform) ? Number(item.transform[4]) : 0
    let row = Number.isFinite(y) ? rows.find(entry => Math.abs(entry.y - y) <= 2) : null
    if (!row) { row = { y: Number.isFinite(y) ? y : -rows.length * 20, parts: [] }; rows.push(row) }
    row.parts.push({ x, text: item.str })
  }
  return rows.sort((a, b) => b.y - a.y).map(row => row.parts.sort((a, b) => a.x - b.x).map(part => part.text).join(' ')).join('\n').slice(0, 150_000)
}

const browserRuntime = {
  async loadPdf() {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = `${assetRoot()}pdf/pdf.worker.min.mjs`
    return pdfjs
  },
  async createOcr(logger) {
    const { createWorker } = await import('tesseract.js')
    return createWorker('eng', 1, {
      workerPath: `${assetRoot()}tesseract/worker.min.js`,
      corePath: `${assetRoot()}tesseract`,
      langPath: `${assetRoot()}lang`,
      workerBlobURL: false, legacyCore: false, legacyLang: false,
      cachePath: 'unidex-local-eng-v1', cacheMethod: 'write', gzip: true,
      logger, errorHandler() { /* The public API rejects its operation; never log private OCR data. */ },
    })
  },
  canvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    return canvas
  },
  async image(blob) {
    if (typeof createImageBitmap !== 'function') throw fail('This browser cannot decode documents locally. Try a current Chrome, Edge, Firefox or Safari browser.', 'LOCAL_OCR_UNSUPPORTED')
    return createImageBitmap(blob, { imageOrientation: 'from-image' })
  },
  async ocrInput(canvas) { return canvas },
  pdfOptions() { return { cMapUrl: `${assetRoot()}pdf/cmaps/`, cMapPacked: true, standardFontDataUrl: `${assetRoot()}pdf/standard_fonts/`, wasmUrl: `${assetRoot()}pdf/wasm/`, iccUrl: `${assetRoot()}pdf/iccs/` } },
}

// The runtime seam also exercises the same orchestration with real Node PDF/OCR
// libraries in the synthetic verification harness, without a browser or provider.
export function createLocalAdmissionsExtractor(runtime = browserRuntime) {
  return async function extract(blob, document, { onProgress = () => {}, signal } = {}) {
    if (document?.document_type === 'photo') throw fail('Profile photos are applied directly and are never sent for text extraction.', 'PHOTO_EXTRACTION_DISABLED')
    const mime = document?.mime_type || blob?.type
    if (!blob || typeof blob.arrayBuffer !== 'function' || !MIME_TYPES.has(mime) || blob.size < 1 || blob.size > LOCAL_OCR_LIMITS.maxBytes) throw fail('Choose a PDF, JPG, PNG or WebP document up to 10 MB.', 'LOCAL_OCR_INVALID_FILE')
    if (signal?.aborted) throw abortError()
    let pdfTask, pdf, worker, initializingWorker, renderTask, canvas, bitmap, closed = false, timeout, cancellationReject
    let page = 1, totalPages = 1, phase = 'loading', lastProgress = 0
    const warnings = [], methods = [], texts = []
    const report = (stage, progress, message) => {
      phase = stage
      const bounded = Math.max(lastProgress, Math.min(1, Number(progress) || 0))
      lastProgress = bounded
      onProgress({ stage, progress: bounded, page, totalPages, message })
    }
    const terminate = () => {
      if (renderTask) { try { renderTask.cancel() } catch { /* already completed */ } }
      if (worker) { ignore(worker.terminate()); worker = null }
      if (pdfTask) ignore(pdfTask.destroy())
    }
    const cancellation = new Promise((_, reject) => { cancellationReject = reject })
    const cancel = () => { closed = true; terminate(); cancellationReject(abortError()) }
    signal?.addEventListener('abort', cancel, { once: true })
    timeout = setTimeout(() => { closed = true; terminate(); cancellationReject(fail('Local extraction took too long on this device. Try a clearer image or a shorter PDF, or enter the details manually.', 'LOCAL_OCR_TIMEOUT')) }, LOCAL_OCR_LIMITS.timeoutMs)
    const check = () => { if (closed || signal?.aborted) throw abortError() }
    const recognize = async source => {
      check()
      if (!worker) {
        report('loading', Math.min(0.15, lastProgress), 'Loading the free English text reader on your device…')
        initializingWorker = runtime.createOcr(message => {
          if (!closed && message.status === 'recognizing text') report('recognizing', 0.15 + 0.75 * ((page - 1 + (Number(message.progress) || 0)) / Math.min(totalPages, LOCAL_OCR_LIMITS.maxPages)), `Reading page ${page} of ${Math.min(totalPages, LOCAL_OCR_LIMITS.maxPages)} on your device…`)
        })
        initializingWorker.then(value => { if (closed) ignore(value.terminate()) }, () => {})
        worker = await initializingWorker
        check()
        await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1', user_defined_dpi: '200' })
      }
      const image = await runtime.ocrInput(source)
      check()
      const result = await worker.recognize(image, {}, { text: true })
      check()
      if (Number.isFinite(result?.data?.confidence) && result.data.confidence < 65) warnings.push(`Page ${page} was difficult to read. Check its extracted values carefully.`)
      return String(result?.data?.text || '').slice(0, 150_000)
    }
    const releaseCanvas = () => { if (canvas) { canvas.width = 1; canvas.height = 1; canvas = null } }
    const run = async () => {
      report('loading', 0, 'Preparing private, free extraction on your device…')
      const bytes = new Uint8Array(await blob.arrayBuffer())
      check()
      if (mime === 'application/pdf') {
        if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw fail('This file does not contain a valid PDF document.', 'LOCAL_OCR_INVALID_FILE')
        const pdfjs = await runtime.loadPdf()
        check()
        pdfTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false, enableXfa: false, maxImageSize: LOCAL_OCR_LIMITS.maxImagePixels, canvasMaxAreaInBytes: LOCAL_OCR_LIMITS.maxOcrPixels * 4, ...runtime.pdfOptions() })
        pdfTask.onPassword = () => { closed = true; ignore(pdfTask.destroy()); cancellationReject(fail('Password-protected PDFs cannot be extracted locally. Upload an unlocked copy or enter the details manually.', 'LOCAL_OCR_PASSWORD_REQUIRED')) }
        pdf = await pdfTask.promise
        check()
        totalPages = pdf.numPages
        if (totalPages > LOCAL_OCR_LIMITS.maxPages) warnings.push(`Only the first ${LOCAL_OCR_LIMITS.maxPages} of ${totalPages} PDF pages were processed. Upload the remaining relevant pages separately.`)
        const count = Math.min(totalPages, LOCAL_OCR_LIMITS.maxPages)
        for (page = 1; page <= count; page++) {
          check()
          report('reading', 0.1 + 0.75 * ((page - 1) / count), `Reading page ${page} of ${count}…`)
          const pdfPage = await pdf.getPage(page)
          try {
            const content = await pdfPage.getTextContent()
            check()
            let text = pdfTextLines(content.items)
            if (text.replace(/[^A-Za-z]/g, '').length >= 30 && text.length >= 45) methods.push('pdf_text')
            else {
              const natural = pdfPage.getViewport({ scale: 1 })
              if (!(natural.width > 0 && natural.height > 0) || !Number.isFinite(natural.width * natural.height)) throw fail('This PDF page has invalid dimensions.', 'LOCAL_OCR_INVALID_FILE')
              const scale = Math.min(2.5, Math.sqrt(LOCAL_OCR_LIMITS.maxOcrPixels / (natural.width * natural.height)), 4096 / Math.max(natural.width, natural.height))
              const viewport = pdfPage.getViewport({ scale })
              canvas = runtime.canvas(Math.max(1, Math.floor(viewport.width)), Math.max(1, Math.floor(viewport.height)))
              const context = canvas.getContext('2d', { alpha: false })
              if (!context) throw fail('This browser could not prepare the scanned document.', 'LOCAL_OCR_UNSUPPORTED')
              renderTask = pdfPage.render({ canvasContext: context, viewport, background: '#ffffff' })
              await renderTask.promise
              renderTask = null
              text = await recognize(canvas)
              methods.push('tesseract_english')
              releaseCanvas()
            }
            texts.push(text)
          } finally { pdfPage.cleanup() }
        }
        page = count
      } else {
        const dimensions = imageDimensions(bytes, mime)
        if (!dimensions?.width || !dimensions?.height) throw fail('This image could not be identified. Upload a valid JPG, PNG or WebP image.', 'LOCAL_OCR_INVALID_FILE')
        if (dimensions.width * dimensions.height > LOCAL_OCR_LIMITS.maxImagePixels || Math.max(dimensions.width, dimensions.height) > 16000) throw fail('This image is too large to read safely on your device. Resize it below 24 megapixels and try again.', 'LOCAL_OCR_IMAGE_TOO_LARGE')
        const decoded = await runtime.image(blob)
        if (closed || signal?.aborted) { decoded.close?.(); check() }
        bitmap = decoded
        check()
        const scale = Math.min(1, Math.sqrt(LOCAL_OCR_LIMITS.maxOcrPixels / (bitmap.width * bitmap.height)), 4096 / Math.max(bitmap.width, bitmap.height))
        canvas = runtime.canvas(Math.max(1, Math.floor(bitmap.width * scale)), Math.max(1, Math.floor(bitmap.height * scale)))
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw fail('This browser could not prepare the document image.', 'LOCAL_OCR_UNSUPPORTED')
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close?.(); bitmap = null
        texts.push(await recognize(canvas)); methods.push('tesseract_english')
        releaseCanvas()
      }
      check()
      report('parsing', 0.95, 'Finding labelled profile details and checking for conflicting values…')
      const parsed = parseLocalAdmissionsText(texts, document)
      const extracted = sanitizeLocalAdmissionsExtraction(parsed.extracted_data, document.document_type)
      if (!Object.keys(extracted).length) throw fail('No clear, labelled profile details were found. Try a sharper English document or enter the details manually.', 'LOCAL_OCR_NO_FIELDS')
      report('complete', 1, 'Extraction complete. Review the details before relying on them.')
      return { extracted_data: extracted, extraction_model: LOCAL_OCR_MODEL, diagnostics: { source: 'browser_local', pages_processed: texts.length, total_pages: totalPages, methods: [...new Set(methods)], warnings: [...new Set([...warnings, ...parsed.warnings])] } }
    }
    try { return await Promise.race([run(), cancellation]) }
    catch (error) {
      if (error?.code?.startsWith('LOCAL_OCR_') || error?.code === 'PHOTO_EXTRACTION_DISABLED' || error?.name === 'AbortError') throw error
      if (error?.name === 'PasswordException') throw fail('Upload an unlocked PDF to extract its details.', 'LOCAL_OCR_PASSWORD_REQUIRED')
      throw fail(phase === 'loading' ? 'The free document reader could not load. Check your connection and try again.' : 'This document could not be read on your device. Try a clearer PDF or image, or enter the details manually.')
    } finally {
      closed = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', cancel)
      terminate()
      bitmap?.close?.()
      releaseCanvas()
      texts.length = 0
    }
  }
}

export const extractLocalAdmissionsFile = createLocalAdmissionsExtractor()
