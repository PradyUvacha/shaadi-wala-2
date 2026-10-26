import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * Deletes the signed-in account.
 * The service role key is injected by Supabase and never ships in the app.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Sign in first." }, 401)

  let body: { confirm?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  if (body.confirm !== "DELETE") return json({ error: "Type DELETE to confirm." }, 400)

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!url || !anon || !service) return json({ error: "Server is missing Supabase credentials." }, 500)

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: "Sign in first." }, 401)
  const userId = userData.user.id

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: owned, error: ownedError } = await admin
    .from("wedding_members")
    .select("wedding_id")
    .eq("user_id", userId)
    .eq("role", "owner")
  if (ownedError) return json({ error: ownedError.message }, 500)

  for (const row of owned ?? []) {
    const weddingId = String(row.wedding_id)
    const { count, error: countError } = await admin
      .from("wedding_members")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .eq("role", "owner")
      .neq("user_id", userId)
    if (countError) return json({ error: countError.message }, 500)
    if ((count ?? 0) === 0) {
      const { error } = await admin.from("weddings").delete().eq("id", weddingId)
      if (error) return json({ error: error.message }, 500)
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) return json({ error: deleteError.message }, 500)
  return json({ ok: true }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
