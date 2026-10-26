/** Profile → Settings → About. versionName stays the release name; N and the short SHA tell builds apart. */
export function aboutVersionLabel(input: {
  versionName: string
  versionCode: number
  buildNumber?: string | number | null
  commitSha?: string | null
}): string {
  return `${input.versionName} (build ${buildNumber(input.buildNumber, input.versionCode)}, ${shortCommitSha(input.commitSha)})`
}

export function shortCommitSha(commitSha: string | null | undefined): string {
  const value = (commitSha ?? '').trim()
  if (!/^[0-9a-f]{7,40}$/i.test(value)) return 'unknown'
  return value.slice(0, 7).toLowerCase()
}

function buildNumber(buildNumber: string | number | null | undefined, versionCode: number): number {
  if (typeof buildNumber === 'number' && Number.isInteger(buildNumber) && buildNumber > 0) return buildNumber
  if (typeof buildNumber === 'string' && /^[0-9]+$/.test(buildNumber.trim())) {
    const parsed = Number(buildNumber.trim())
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed
  }
  return versionCode
}
