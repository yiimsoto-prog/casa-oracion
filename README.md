# Casa de Oración — Challhuahuacho (PWA)

Gestión financiera y eclesiástica offline-first, instalable en Android e iPhone.

## Enlaces

- App en Cursor (privada): use el pill de la app en Cursor tras publicar.
- Despliegue producción recomendado: ver [DEPLOY.md](DEPLOY.md) (GitHub/GitLab + Cloudflare Pages + Supabase).

## Seguridad (r4)

- El **rol no se persiste** en `sessionStorage` (solo identidad).
- En hosts publicados (`*.pages.dev`, `*.apps.grok.bot`) el acceso es **solo Supabase**; el rol se lee de `perfiles` en cada sesión y al volver a la pestaña.
- Las escrituras en nube dependen de **RLS** (`supabase/rls-harden.sql`).
- Contraseñas locales (solo localhost): PBKDF2. Los respaldos no exportan hashes.

## Desarrollo local

```bash
cd casa-oracion
python3 -m http.server 4321 --bind 127.0.0.1
```

En `127.0.0.1` puede crear la cuenta líder inicial. En producción nube no aplica.
