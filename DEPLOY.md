# Enlazar con Cloudflare Pages existente

URL actual: **https://casa-oracion-challhuahuacho.pages.dev/**

Proyecto Pages (nombre típico): `casa-oracion-challhuahuacho`  
Repo GitHub: **https://github.com/yiimsoto-prog/casa-oracion**

## Opción recomendada (panel Cloudflare)

1. Entra a https://dash.cloudflare.com con la cuenta dueña de `copnav.org` / ese Pages.
2. **Workers & Pages** → abre el proyecto **`casa-oracion-challhuahuacho`** (el de esa URL).
3. Pestaña **Settings** → **Builds & deployments** → **Connect to Git** (o *Manage production branch*).
4. Autoriza GitHub y elige el repo **`yiimsoto-prog/casa-oracion`**.
5. Configuración de build:
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: `/`
   - Root directory: `/`
   - Production branch: `main`
6. **Save and Deploy** (o Retry deployment).
7. Cuando termine, recarga https://casa-oracion-challhuahuacho.pages.dev/ — debe mostrar versión **r6** o superior en `/version.json`.

## Dominio copnav.org (opcional)

En el mismo proyecto → **Custom domains** → `casa.copnav.org` (recomendado) o `copnav.org`.

## Supabase

SQL Editor → ejecutar `supabase/rls-harden.sql` → usuarios Auth + tabla `perfiles`.
