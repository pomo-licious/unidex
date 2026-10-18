/** Conservative normalization of the workbook's consolidated programme cells. */
export const SOURCE_ID = /^NCR-\d+$/
export const unique = values => [...new Set(values.filter(value => value !== null && value !== undefined && value !== ''))]

export function sourceUrls(value) {
  return unique((String(value ?? '').match(/https?:\/\/[^\s<>"|]+/g) ?? [])
    .map(url => url.replace(/[),.;]+$/, '')))
}

export function programmeCell(value, sourceRecordId) {
  if (value === null || value === undefined || typeof value !== 'string') return value ?? null
  const expression = /^([^\n]*?\[NCR-\d+\][^\n]*?):[ \t]*/gm
  const labels = [...value.matchAll(expression)]
  if (!labels.length) return value.trim() || null
  const prefix = value.slice(0, labels[0].index).replace(/Programme (?:evidence|controls):\s*$/i, '').trim()
  const matching = labels.flatMap((label, index) => {
    const ids = label[1].match(/NCR-\d+/g) ?? []
    if (!ids.includes(sourceRecordId)) return []
    return [value.slice(label.index + label[0].length, labels[index + 1]?.index ?? value.length)
      .replace(/\n\nProgramme (?:evidence|controls):\s*$/i, '').trim()]
  })
  return unique([prefix, ...matching]).join('\n\n') || null
}

export function programmeDefinitions(row) {
  const names = new Map()
  const value = String(row.Programmes ?? '')
  for (const match of value.matchAll(/^(?:Numeric reference: )?(.+?) \[(NCR-\d+)\]\s*$/gm)) names.set(match[2], match[1])
  return String(row['Consolidated programme IDs'] ?? row.ID).split(/;\s*/).filter(id => SOURCE_ID.test(id))
    .map(id => ({ sourceRecordId: id, name: names.get(id) ?? `Programme ${id}` }))
}

export function labelledNumber(value, label) {
  const match = String(value ?? '').match(new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'))
  const result = match ? Number(match[1]) : null
  return Number.isFinite(result) && result > 0 ? result : null
}

export function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function acceptedExams(label) {
  // Do not turn an explicit absence of CAT or an institute-only route into CAT acceptance.
  const text = String(label ?? '')
    .replace(/\bCAT\s+(?:not required|not the standard route)/gi, '')
    .replace(/not\s+CAT[- ]driven/gi, '')
  const patterns = [
    ['CUET-PG', /CUET[- ]?PG/i], ['IPU CET', /IPU[- ]?CET|\bCET\b/i],
    ['CAT', /\bCAT\b/i], ['XAT', /\bXAT\b/i], ['CMAT', /\bCMAT\b/i],
    ['MAT', /\bMAT\b/i], ['GMAT', /\bGMAT\b/i], ['GRE', /\bGRE\b/i],
    ['NMAT', /\bNMAT\b/i], ['ATMA', /\bATMA\b/i], ['SNAP', /\bSNAP\b/i],
  ]
  return patterns.filter(([, expression]) => expression.test(text)).map(([name]) => name)
}

export function programmeStatus(row, sourceRecordId) {
  const control = String(row.Notes ?? '').split('Programme controls:')[1]
  if (!control) return row.Status
  const line = control.split('\n').find(value => value.includes(`[${sourceRecordId}]`))
  return line?.match(/:\s*status\s+(.+?)(?:;\s*scenario baseline|$)/i)?.[1]?.trim() ?? row.Status
}

export function sheetRecords(snapshot, sheetName) {
  const rows = snapshot.sheets[sheetName] ?? []
  const header = rows.find(row => row.row === 5)?.values ?? []
  return rows.filter(row => row.row > 5).map(({ row, values }) => ({
    row,
    fields: Object.fromEntries(header.map((name, index) => [name, values[index] ?? null]).filter(([name]) => name)),
  }))
}
