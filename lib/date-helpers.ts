export function ymd(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

export function formatarData(iso: string): string {
  if (!iso) return ''
  const [ano, mes, dia] = ymd(iso).split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarDataCurta(iso: string): string {
  if (!iso) return ''
  const [, mes, dia] = ymd(iso).split('-')
  return `${dia}/${mes}`
}

export function formatarDataHora(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function nomeDiaSemana(iso: string): string {
  if (!iso) return ''
  const data = new Date(`${ymd(iso)}T12:00:00`)
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][data.getDay()] ?? ''
}

export function agruparPor<T>(
  items: T[],
  getKey: (item: T) => string,
): { chave: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = getKey(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([chave, grupo]) => ({ chave, items: grupo }))
}
