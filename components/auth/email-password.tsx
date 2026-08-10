import { createServerSupabaseClient } from "@/lib/supabase/server";



export default async function EmailPassword() {
    const supabase = await createServerSupabaseClient()



}