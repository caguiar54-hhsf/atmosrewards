import { supabase } from "./supabaseClient";

// Re-implements the same window.storage.get/set/delete/list API that the app was
// originally written against (Claude's artifact storage), backed by a single
// Supabase table instead. This means AtmosTracker.jsx needs no changes at all —
// it just calls window.storage exactly like before.
//
// Table shape (see supabase/schema.sql):
//   kv_store(user_id uuid, key text, value jsonb, updated_at timestamptz)
//   unique(user_id, key)
//   RLS: only the owning user can read/write their own rows.
//
// This app never uses the "shared" (cross-user) mode, so `shared` is accepted
// for interface compatibility but always treated as false/private.

async function currentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export function installStorageShim() {
  window.storage = {
    async get(key) {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from("kv_store")
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();
      if (error || !data) return null;
      return { key, value: data.value, shared: false };
    },

    async set(key, value) {
      const userId = await currentUserId();
      if (!userId) return null;
      const { error } = await supabase
        .from("kv_store")
        .upsert(
          { user_id: userId, key, value, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key" }
        );
      if (error) {
        // eslint-disable-next-line no-console
        console.error("storage.set failed:", error.message);
        return null;
      }
      return { key, value, shared: false };
    },

    async delete(key) {
      const userId = await currentUserId();
      if (!userId) return null;
      const { error } = await supabase.from("kv_store").delete().eq("user_id", userId).eq("key", key);
      if (error) return null;
      return { key, deleted: true, shared: false };
    },

    async list(prefix = "") {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from("kv_store")
        .select("key")
        .eq("user_id", userId)
        .ilike("key", `${prefix}%`);
      if (error) return null;
      return { keys: data.map((row) => row.key), prefix, shared: false };
    },
  };
}
