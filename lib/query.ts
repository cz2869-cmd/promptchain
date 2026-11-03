export function explainQuery(message: string) {
  if (/does not exist|schema cache|could not find the (table|function)/i.test(message)) {
    return 'Run supabase/prompt-chains.sql in the Supabase SQL editor, then refresh.'
  }
  if (/prompt_chains_name|prompt_chains_name_key/i.test(message)) {
    return 'A chain with that name already exists.'
  }
  return message
}
