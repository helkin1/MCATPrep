import { supabase } from "./supabase";

/**
 * Data layer. Matches the JSONB-blob-per-user convention from the Atlas project.
 *
 * Tables (see mcat-supabase-schema.sql):
 *   profiles      — { id, exam_date date, onboarding_complete bool, settings jsonb }
 *   mcat_days     — { user_id, data jsonb }   data = { "YYYY-MM-DD": { blocks, todos } }
 *   mcat_templates — { user_id, data jsonb }  data = { daily: [...], weekly: [...] }
 *
 * All reads/writes operate on the authenticated user (RLS enforced).
 */

async function requireUser() {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

/* ── Profile ────────────────────────────────────────────── */

export async function getProfile() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, exam_date, onboarding_complete, settings")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data || { id: user.id, exam_date: null, onboarding_complete: false, settings: {} };
}

export async function updateProfile(patch) {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ── Days (the schedule blob) ────────────────────────────── */

export async function getDays() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("mcat_days")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.data || {};
}

export async function saveDays(days) {
  const user = await requireUser();
  const { error } = await supabase
    .from("mcat_days")
    .upsert(
      { user_id: user.id, data: days, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

/* ── Templates ──────────────────────────────────────────── */

export async function getTemplates() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("mcat_templates")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.data || { daily: [], weekly: [] };
}

export async function saveTemplates(templates) {
  const user = await requireUser();
  const { error } = await supabase
    .from("mcat_templates")
    .upsert(
      { user_id: user.id, data: templates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
