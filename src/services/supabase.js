import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uarwnztqtlmxdxpnunup.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhcnduenRxdGxteGR4cG51bnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDUwMzAsImV4cCI6MjA5NzU4MTAzMH0.gDrqQBnuW82DxmTmBAXszAbEmE6q-tvV5OSe_6Wqy6I";

export const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});
export function getSB() { return _sb; }
export async function sbInsert(table, row) {
  const { error } = await _sb.from(table).insert(row);
  return error;
}
