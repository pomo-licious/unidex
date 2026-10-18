import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Copy only pinned runtime assets; browser extraction never falls back to a CDN.
const root = fileURLToPath(new URL('..', import.meta.url))
const target = path.join(root, 'public/assets/ocr/v1')
const expected = { 'tesseract.js': '7.0.0', 'tesseract.js-core': '7.0.0', 'pdfjs-dist': '6.4.299', '@tesseract.js-data/eng': '1.0.0' }
for (const [name, version] of Object.entries(expected)) {
  const installed = JSON.parse(await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8'))
  if (installed.version !== version) throw new Error(`OCR asset version mismatch: ${name}. Expected ${version}; update the reviewed asset manifest before upgrading.`)
}
await rm(target, { recursive: true, force: true })
await mkdir(path.join(target, 'tesseract'), { recursive: true })
await mkdir(path.join(target, 'lang'), { recursive: true })
await mkdir(path.join(target, 'pdf'), { recursive: true })
await cp(path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'), path.join(target, 'tesseract/worker.min.js'))
for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
  const file = `tesseract-core-${variant}.wasm.js`
  await cp(path.join(root, 'node_modules/tesseract.js-core', file), path.join(target, 'tesseract', file))
}
await cp(path.join(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), path.join(target, 'lang/eng.traineddata.gz'))
await cp(path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), path.join(target, 'pdf/pdf.worker.min.mjs'))
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) await cp(path.join(root, 'node_modules/pdfjs-dist', directory), path.join(target, 'pdf', directory), { recursive: true })
await cp(path.join(root, 'node_modules/tesseract.js/LICENSE.md'), path.join(target, 'TESSERACT-LICENSE.txt'))
await cp(path.join(root, 'node_modules/tesseract.js-core/LICENSE'), path.join(target, 'TESSERACT-CORE-LICENSE.txt'))
await cp(path.join(root, 'node_modules/pdfjs-dist/LICENSE'), path.join(target, 'PDFJS-LICENSE.txt'))
await writeFile(path.join(target, 'NOTICE.txt'), 'Unidex free local document extraction runtime.\nTesseract.js 7.0.0 and Tesseract.js-core 7.0.0: Apache-2.0.\nPDF.js 6.4.299: Apache-2.0.\n@tesseract.js-data/eng 1.0.0: MIT package; English traineddata from naptha/tessdata.\nSee bundled licenses and upstream package metadata.\nOnly English LSTM recognition is enabled. Generated from package-lock.json by prepare-ocr-assets.mjs.\n')
console.log('Prepared self-hosted PDF.js and English OCR assets.')
