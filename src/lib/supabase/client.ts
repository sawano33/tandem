import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client Supabase côté navigateur (clé publique uniquement, protégée par RLS). */
export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      // Valeurs factices en mode démo : le client est créé mais jamais utilisé.
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo",
    );
  }
  return client;
}
