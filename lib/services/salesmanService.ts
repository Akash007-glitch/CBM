/**
 * salesmanService.ts
 *
 * Read + manage operations for the `salesmen` table.
 * Admin-only mutations (create/deactivate) are enforced by RLS.
 */

import { supabase } from "@/app/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type SalesmanRow = Tables<"salesmen">;
export type SalesmanInsert = TablesInsert<"salesmen">;
export type SalesmanUpdate = TablesUpdate<"salesmen">;

// ── Joined type returned by getSalesmen ───────────────────────────────────────

export interface SalesmanWithProfile extends SalesmanRow {
  profiles: {
    full_name: string;
    email: string | null;
    role: string;
    is_active: boolean;
  } | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Returns all salesmen with their linked profile.
 * Admins see all; salesmen see only their own row (enforced by RLS).
 */
export async function getSalesmen(): Promise<SalesmanWithProfile[]> {
  const { data, error } = await supabase
    .from("salesmen")
    .select(
      `*, profiles (full_name, email, role, is_active)`
    )
    .order("name");

  if (error) throw new Error(`getSalesmen: ${error.message}`);
  return (data ?? []) as SalesmanWithProfile[];
}

/**
 * Returns a single salesman by their salesmen.id.
 */
export async function getSalesman(id: string): Promise<SalesmanWithProfile | null> {
  const { data, error } = await supabase
    .from("salesmen")
    .select(`*, profiles (full_name, email, role, is_active)`)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getSalesman: ${error.message}`);
  }
  return data as SalesmanWithProfile;
}

/**
 * Returns the salesman row whose user_id matches the current auth user.
 * Used to resolve the current salesman's ID for filtering.
 */
export async function getMyProfile(): Promise<SalesmanRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("salesmen")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`getMyProfile: ${error.message}`);
  }
  return data;
}

// ── Mutations (Admin-only \u2014 RLS enforces) ───────────────────────────────────────

/**
 * Creates a new salesman record.
 * The associated auth user must already exist (via Supabase Auth).
 * The `user_id` must reference a profile with role = 'salesman'.
 */
export async function createSalesman(
  payload: SalesmanInsert
): Promise<SalesmanRow> {
  const { data, error } = await supabase
    .from("salesmen")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`createSalesman: ${error.message}`);
  return data;
}

/**
 * Updates salesman fields (name, phone, email, employee_code, is_active).
 */
export async function updateSalesman(
  id: string,
  payload: SalesmanUpdate
): Promise<SalesmanRow> {
  const { data, error } = await supabase
    .from("salesmen")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateSalesman: ${error.message}`);
  return data;
}

/**
 * Deactivates a salesman (soft delete).
 */
export async function deactivateSalesman(id: string): Promise<void> {
  const { error } = await supabase
    .from("salesmen")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(`deactivateSalesman: ${error.message}`);
}
