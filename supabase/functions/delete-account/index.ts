import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { isNewApiKey, resolveEdgeKeys, userJwt } from "./keys.ts"

/**
 * Deletes the signed-in account.
 * The secret key is injected by Supabase and never ships in the app.
 * New `sb_` keys are sent as `apikey` only. The caller must send their user JWT.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405)

  const jwt = userJwt(req.headers.get("Authorization"))
  if (!jwt) return json({ error: "Sign in first." }, 401)

  let body: { confirm?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  if (body.confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400)

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const { publishable, secret } = resolveEdgeKeys({
    SUPABASE_PUBLISHABLE_KEYS: Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
    SUPABASE_PUBLISHABLE_KEY: Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
    SUPABASE_SECRET_KEYS: Deno.env.get("SUPABASE_SECRET_KEYS"),
    SUPABASE_SECRET_KEY: Deno.env.get("SUPABASE_SECRET_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  })
  if (!url || !publishable || !secret) return json({ error: "Server is missing Supabase credentials." }, 500)

  const userClient = createClient(url, publishable, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
      fetch: fetchWithoutKeyBearer(publishable),
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt)
  if (userError || !userData.user) return json({ error: "Sign in first." }, 401)
  const userId = userData.user.id

  const admin = createClient(url, secret, {
    global: { fetch: fetchWithoutKeyBearer(secret) },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: releaseError } = await admin.rpc("release_account", { p_user_id: userId })
  if (releaseError) return json({ error: releaseError.message }, 500)

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) return json({ error: deleteError.message }, 500)
  return json({ ok: true }, 200)
})

function fetchWithoutKeyBearer(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers)
    if (isNewApiKey(apiKey) && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization")
    }
    return fetch(input, { ...init, headers })
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
