import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xhdjmtkijstqzkkvytjo.supabase.co";
const supabaseKey = "sb_publishable_W0eziNOb2IgBZWxIrfO2tQ_c23BndYZ";

export const supabase = createClient(supabaseUrl, supabaseKey);
