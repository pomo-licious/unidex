// Real synthetic smoke checks. No browser, user files, account or AI API calls.
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { createWorker } from 'tesseract.js'
import { createLocalAdmissionsExtractor } from '../src/lib/admissionsLocalOcr.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const assets = path.join(root, 'public/assets/ocr/v1')
const records = [
  'Name: Synthetic Test Applicant',
  'Date of birth: 2000-04-17',
  'Board: CBSE',
  'School: Example Senior School',
  'Year of passing: 2016',
  'Overall percentage: 91.4%',
]
const canvas = createCanvas(1400, 1400)
const context = canvas.getContext('2d')
context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height)
context.fillStyle = 'black'; context.font = '36px DejaVu Sans'
records.forEach((line, i) => context.fillText(line, 80, 150 + i * 95))

function pdf(objects) {
  const chunks = [Buffer.from('%PDF-1.7\n')], offsets = [0]
  for (let index = 0; index < objects.length; index++) {
    offsets.push(chunks.reduce((n, chunk) => n + chunk.length, 0))
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`), Buffer.isBuffer(objects[index]) ? objects[index] : Buffer.from(objects[index]), Buffer.from('\nendobj\n'))
  }
  const start = chunks.reduce((n, chunk) => n + chunk.length, 0)
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`))
  return Buffer.concat(chunks)
}
function stream(dictionary, data) { return Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`), data, Buffer.from('\nendstream')]) }
const text = Buffer.from(`BT /F1 16 Tf 40 750 Td 30 TL ${records.map((line, i) => `${i ? 'T* ' : ''}(${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')} ET`)
const textPdf = pdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', stream('', text)])
const jpeg = canvas.toBuffer('image/jpeg')
const scannedPdf = pdf(['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 700] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>', stream('/Type /XObject /Subtype /Image /Width 1400 /Height 1400 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', jpeg), stream('', Buffer.from('q 700 0 0 700 0 0 cm /Im1 Do Q'))])
const metrics = { workers: 0, terminated: 0 }
const runtime = {
  async loadPdf() {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(root, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href
    return pdfjs
  },
  async createOcr(logger) {
    metrics.workers++
    const worker = await createWorker('eng', 1, { langPath: path.join(assets, 'lang'), corePath: path.join(assets, 'tesseract/tesseract-core-simd-lstm.wasm.js'), cacheMethod: 'none', logger })
    const terminate = worker.terminate.bind(worker)
    worker.terminate = () => { metrics.terminated++; return terminate() }
    return worker
  },
  canvas: createCanvas,
  image: async () => canvas,
  ocrInput: async value => value.toBuffer('image/png'),
  pdfOptions: () => ({ cMapUrl: path.join(assets, 'pdf/cmaps/'), cMapPacked: true, standardFontDataUrl: path.join(assets, 'pdf/standard_fonts/'), wasmUrl: path.join(assets, 'pdf/wasm/'), iccUrl: path.join(assets, 'pdf/iccs/') }),
}
const extract = createLocalAdmissionsExtractor(runtime)
for (const [label, bytes, mime, method] of [['text PDF', textPdf, 'application/pdf', 'pdf_text'], ['PNG OCR', canvas.toBuffer('image/png'), 'image/png', 'tesseract_english'], ['scanned PDF OCR', scannedPdf, 'application/pdf', 'tesseract_english']]) {
  const start = performance.now()
  const result = await extract(new Blob([bytes], { type: mime }), { document_type: 'academic_10th', mime_type: mime })
  assert.equal(result.extracted_data.full_name, 'Synthetic Test Applicant')
  assert.equal(result.extracted_data.academic_10th.percentage, 91.4)
  assert.equal(result.extracted_data.academic_10th.board, 'CBSE')
  assert.equal(result.extracted_data.date_of_birth, '2000-04-17')
  assert.deepEqual(result.diagnostics.methods, [method])
  assert.equal('text' in result, false)
  console.log(`${label}: actual ${method} passed (${Math.round(performance.now() - start)} ms; four structured facts verified).`)
}
assert.equal(metrics.workers, 2)
assert.equal(metrics.terminated, 2)
console.log('All synthetic checks passed; OCR workers terminated; no provider calls.')
