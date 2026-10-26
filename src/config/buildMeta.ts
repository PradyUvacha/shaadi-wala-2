declare const __SHAADI_COMMIT_SHA__: string

/** Full commit from VERCEL_GIT_COMMIT_SHA or GITHUB_SHA, baked in at build time. */
export const commitSha = typeof __SHAADI_COMMIT_SHA__ === 'string' ? __SHAADI_COMMIT_SHA__ : ''
