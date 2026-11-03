# Prompt Chain

Superadmin studio for the Morningside Nook cafe chains.

The public site asks for vibes and a note, then suggests one cafe. This app is where that prompt lives. A second chain goes the other way: choose a cafe, such as Joe's Coffee, and the model returns the vibes it feels like plus a short description.

The studio opens only for a signed-in profile with `profiles.is_superadmin = true`.

## What you can do

- Create, update, and delete a prompt chain
- Create, update, and delete a step
- Move a step up or down
- Run the chain and read the media it generates
- See earlier runs for that chain, and the student suggestions saved for Suggest a cafe
- Switch the studio between light, dark, and the system theme

## Tokens

Steps run from top to bottom. A system step is the model's rules. A user step is a request. These tokens are filled in when you press Generate:

| Token | Filled with |
| --- | --- |
| `{{vibes}}` | The presets that were tapped |
| `{{note}}` | The written prompt |
| `{{catalog}}` | The cafe list, one cafe per line |
| `{{cafe}}` | The cafe you picked |
| `{{previous}}` | The text returned by the previous user step |
| `{{input}}` | The same written prompt, for a chain that is not about vibes |

Suggest a cafe uses `{{vibes}}`, `{{note}}`, and `{{catalog}}`. Read a cafe uses `{{cafe}}`. A longer chain can pass each answer forward with `{{previous}}`.

## Setup

Use the same Supabase project as Morningside Nook. In the SQL editor, run Nook Desk's `supabase/admin.sql` first if `profiles.is_superadmin` is not there yet. Then run [`supabase/prompt-chains.sql`](supabase/prompt-chains.sql). That file creates the chain tables and seeds Suggest a cafe and Read a cafe. It does not overwrite steps you have already saved.

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
```

Add this app's `/auth/callback` URL to the Supabase Google redirect allow list. For local work that is `http://localhost:3000/auth/callback`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

Import this GitHub repository as a new Vercel project, framework Next.js. Set the same three environment variables. After the first deploy, add `https://<your-domain>/auth/callback` to the Supabase redirect allow list.
