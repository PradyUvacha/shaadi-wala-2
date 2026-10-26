// Vercel skips a preview when this command exits 0, and builds when it exits 1.
// Every push should publish a new preview, including the pull-request branch.
process.exit(1)
