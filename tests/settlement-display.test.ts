import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))
const banned = /mark[_-]?settled|markSettled|settled_at|is_settled|settlement_paid/i

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist') return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|sql)$/.test(entry.name) ? [path] : []
  })
}

describe('STL-13 settlement stays display-only', () => {
  it('has no mark-settled endpoint, column, or write path', () => {
    const hits = [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'supabase'))]
      .filter((path) => banned.test(readFileSync(path, 'utf8')))
    expect(hits).toEqual([])
    const budget = readFileSync(join(root, 'src/features/budget/BudgetTab.tsx'), 'utf8')
    expect(budget).not.toMatch(/Mark settled|Settle now/)
    const api = readFileSync(join(root, 'src/lib/weddingApi.ts'), 'utf8')
    expect(api).not.toMatch(/\.rpc\(\s*['"][^'"]*settl/i)
  })
})
