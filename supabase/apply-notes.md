# Aplicar RLS en el proyecto Supabase

Cuenta sugerida: la misma con la que administras el proyecto (p. ej. yiimsoto@gmail.com).

1. Abre https://supabase.com/dashboard → tu proyecto `imwvbfoyfqbgfijceady` (o el que uses).
2. SQL → New query.
3. Pega y ejecuta todo el contenido de `rls-harden.sql`.
4. Authentication → Users: crea las cuentas (pastor@…, tesorero@…, etc.) o las que elijas.
5. Table Editor → `perfiles`: una fila por usuario con `id` = UUID de Auth, `rol` (`lider`|`tesorero`|`secretario`|`miembro`), `nombre`.
6. Prueba: sin sesión, `GET /rest/v1/diezmos` con solo la anon key no debe listar datos.
