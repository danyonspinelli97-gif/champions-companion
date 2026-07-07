import { supabase } from "./supabase.js";
import type { TeamMember } from "@champions/team-builder";

export const MAX_TEAMS = 5;

export interface SavedTeam {
  id: string;
  name: string;
  data: TeamMember[];
  created_at: string;
}

/** List the signed-in user's saved teams (RLS scopes this to them). */
export async function listTeams(): Promise<SavedTeam[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,data,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SavedTeam[];
}

/** Save a new team. user_id is set by the table default (auth.uid()). */
export async function saveTeam(name: string, data: TeamMember[]): Promise<void> {
  if (!supabase) throw new Error("Auth not configured");
  const { error } = await supabase.from("teams").insert({ name, data });
  if (error) throw new Error(error.message); // includes the DB 5-team-limit trigger
}

export async function deleteTeam(id: string): Promise<void> {
  if (!supabase) throw new Error("Auth not configured");
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
