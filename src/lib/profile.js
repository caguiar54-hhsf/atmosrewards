import { supabase } from "./supabaseClient";

// Profile info (display name + avatar URL) lives in Supabase Auth's user metadata —
// no separate "profiles" table needed. Avatar files live in a public "avatars" Storage
// bucket, one folder per user (see supabase/schema.sql for the bucket + RLS policies).

export function deriveUser(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    fullName: u.user_metadata?.full_name || "",
    avatarUrl: u.user_metadata?.avatar_url || null,
  };
}

export async function updateProfile({ fullName, avatarUrl }) {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName, avatar_url: avatarUrl },
  });
  if (error) throw error;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function uploadAvatar(file) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const ext = file.name.split(".").pop() || "png";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl;

  await updateProfile({ fullName: user.user_metadata?.full_name || "", avatarUrl: url });
  return url;
}
