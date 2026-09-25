# Lucius Synth

Application Next.js avec persistance Supabase.

## Configuration Supabase

Dans `.env.local`, définir :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ADMIN_EMAIL=<email-de-l-utilisateur-admin>
```

`NEXT_PUBLIC_SUPABASE_URL` se trouve dans **Project Settings > API**. La
`SUPABASE_SERVICE_ROLE_KEY` est également dans **Project Settings > API** et
ne doit jamais être exposée au navigateur ou commise dans Git. Cette
application ne lit et n'écrit dans Supabase qu'au travers de routes serveur.
`SUPABASE_ADMIN_EMAIL` permet d'accorder le rôle admin au compte existant.

Exécuter `supabase/schema.sql` dans le SQL Editor du projet Supabase. Cela crée
les tables `public.luciussynth_musicdocuments` et `public.luciussynth_posts`,
avec une référence UUID vers `auth.users`. Les tables sont neuves et sans
contenu initial. Aucun formulaire d'inscription n'est fourni : créer/gérer les
comptes via Supabase Auth.

La connexion se fait avec l'e-mail et le mot de passe du compte Supabase. Les
cookies d'accès et de rafraîchissement sont HttpOnly. Pour renouveler une
session expirée, l'utilisateur doit se reconnecter.
