# Despliegue GitHub + Cloudflare + Supabase

Operador: **yiimsoto@gmail.com**

## GitHub
Repo: https://github.com/yiimsoto-prog/casa-oracion

## Cloudflare Pages
1. dash.cloudflare.com → Workers & Pages → Create → Connect Git → este repo
2. Framework: None · Root: `/` · Build vacío · Output: `/`
3. Secrets opcionales para Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Supabase
1. SQL Editor → ejecutar `supabase/rls-harden.sql`
2. Crear usuarios Auth + filas en `perfiles`
3. Si cambia el proyecto, editar `config.js`
