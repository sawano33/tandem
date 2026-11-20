// TANDEM — connexion en un geste, comme MAISON : « Guillaume » ou « Emma », sans e-mail ni mot de passe.
//
// Chaque personne a quand même un vrai compte Supabase (les dépenses sont rattachées à un vrai
// utilisateur et la RLS fonctionne). Cette fonction retrouve le compte de la personne choisie,
// le crée la première fois, crée le foyer ou y ajoute la personne, puis renvoie une session.
// Aucun e-mail n'est envoyé.
//
// Compromis (le même que MAISON) : toute personne qui a l'adresse de l'app peut se connecter.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PEOPLE: Record<string, { name: string; color: string; email: string }> = {
  G: { name: "Guillaume", color: "#C5B6F2", email: "guillaume@tandem.app" },
  E: { name: "Emma", color: "#FFAE97", email: "emma@tandem.app" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const { who } = await req.json().catch(() => ({}));
    const person = PEOPLE[who];
    if (!person) return json({ error: "invalid_person" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, opts);
    const pub = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, opts);

    // 1. Le compte de la personne (créé la première fois)
    const { error: createError } = await admin.auth.admin.createUser({
      email: person.email, email_confirm: true, user_metadata: { first_name: person.name },
    });
    if (createError && !/already|exists|registered/i.test(createError.message)) throw createError;

    // 2. Une session, sans e-mail
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: person.email });
    if (linkError) throw linkError;
    const { data: verified, error: verifyError } = await pub.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (verifyError || !verified.session) throw verifyError ?? new Error("no_session");
    const session = verified.session;
    const uid = session.user.id;

    // 3. Profil : prénom et couleur à la première connexion
    const firstTime = !createError;
    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", uid).maybeSingle();
    if (!profile) await admin.from("profiles").insert({ id: uid, first_name: person.name, color: person.color });
    else if (firstTime || !profile.first_name) await admin.from("profiles").update({ first_name: person.name, color: person.color }).eq("id", uid);

    // 4. Le foyer unique de cette installation
    const { data: membership } = await admin.from("household_members").select("household_id").eq("user_id", uid).maybeSingle();
    if (!membership) {
      const { data: household } = await admin.from("households").select("id").order("created_at").limit(1).maybeSingle();
      if (!household) {
        const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
          ...opts, global: { headers: { Authorization: `Bearer ${session.access_token}` } },
        });
        const { error } = await asUser.rpc("create_household", { p_name: "Guillaume & Emma" });
        if (error && !/déjà/.test(error.message)) throw error;
      } else {
        const { error } = await admin.from("household_members").insert({ household_id: household.id, user_id: uid, role: "member" });
        if (error && !/duplicate key/.test(error.message)) throw error;
      }
    }

    return json({ access_token: session.access_token, refresh_token: session.refresh_token });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error)?.message ?? "login_failed" }, 500);
  }
});
