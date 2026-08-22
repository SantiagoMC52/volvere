# Despliegue a producción — Volveré

Cómo llevar el proyecto de `Volveré-dev` (desarrollo) a `Volveré` (producción) + Vercel.

Documento complementario a `supabase-mcp-setup.md`, que explica por qué existen dos proyectos de Supabase separados.

## Los dos proyectos

| Proyecto      | Uso                    |
| ------------- | ---------------------- |
| `Volveré-dev` | Desarrollo local y MCP |
| `Volveré`     | Producción (Vercel)    |

A lo largo del documento, `<ref-dev>` y `<ref-prod>` son los refs de cada proyecto. Los tienes en la URL de su dashboard, o listados con `pnpm supabase projects list`.

## El modelo mental

A producción tienen que viajar tres cosas, y cada una va por un camino distinto:

| Qué                                                      | Cómo viaja                               |
| -------------------------------------------------------- | ---------------------------------------- |
| Esquema: tablas, RLS, el bucket y sus políticas          | Migraciones SQL, con la CLI de Supabase  |
| Config de Auth: proveedor de Google, URLs de redirección | **A mano** en el dashboard de producción |
| Credenciales de la app                                   | Variables de entorno en Vercel           |

Lo segundo es lo que suele pillar por sorpresa: `Volveré` es un proyecto completamente separado de `Volveré-dev`, así que no sabe nada del cliente de Google OAuth ni de las URLs de redirección. Eso no está en ningún fichero SQL y `db push` no lo lleva.

> **El MCP no interviene en nada de esto.** Sigue apuntando a `Volveré-dev` y así debe quedarse. La CLI es una herramienta distinta y es la que sí se enlaza con producción.

## La CLI de Supabase

Está instalada como dependencia de desarrollo, así la versión queda fijada en el repo y no depende de la máquina. Se invoca con `pnpm supabase <comando>`.

**`supabase init`** — crea `supabase/config.toml` (config del proyecto) y `supabase/.gitignore` (ignora `.temp`, el estado local de la CLI). Ojo: el bloque `[auth]` de `config.toml`, con su `site_url = "http://127.0.0.1:3000"`, configura **el stack local de Docker**, no los proyectos remotos. Las URLs de prod van en el dashboard.

**`supabase login`** — autentica la CLI con tu cuenta. Una vez por máquina.

**`supabase link --project-ref <ref>`** — enlaza esta carpeta con un proyecto remoto.

**`supabase db push`** — compara las versiones de `supabase/migrations/` con la tabla `supabase_migrations.schema_migrations` del proyecto enlazado y aplica las que faltan, en orden. Antes del real, siempre el ensayo:

```bash
pnpm supabase db push --dry-run
```

### ⚠️ La carpeta está enlazada a producción

Cualquier `db push` desde aquí va contra `Volveré`. Para aplicar algo a dev hay que reenlazar primero:

```bash
pnpm supabase link --project-ref <ref-dev>
```

El ref enlazado vive en `supabase/.temp/`, que está ignorado, así que **el repo no deja constancia de a cuál apuntas**. Compruébalo con `pnpm supabase projects list` (columna `linked`) antes de cualquier push.

### Los nombres de fichero son la fuente de verdad

`db push` compara **números de versión**: el timestamp del nombre de fichero contra la tabla del remoto. Las tres primeras migraciones se aplicaron con `apply_migration` del MCP, que registró su propio timestamp, distinto al del fichero; hubo que renombrar los ficheros para que coincidieran. Si vuelves a aplicar algo por MCP, comprueba que el fichero local acabe con la versión que quedó registrada.

## Google OAuth

Un **único cliente OAuth** en Google Cloud sirve para los dos entornos: admite varias URIs de redirección autorizadas.

```
https://<ref-dev>.supabase.co/auth/v1/callback    ← dev
https://<ref-prod>.supabase.co/auth/v1/callback   ← prod
```

Se **añaden**, no se sustituyen. Por eso el mismo client ID y el mismo secret se pegan en los dos proyectos de Supabase (Authentication → Sign In / Providers → Google).

"Orígenes autorizados de JavaScript" se deja vacío: el navegador nunca llama a Google desde nuestro dominio, el flujo pasa siempre por `<ref>.supabase.co`.

**Estado de publicación**: la pantalla de consentimiento tiene que estar en _In production_, no en _Testing_. En _Testing_ solo entran las cuentas añadidas como usuarios de prueba y las sesiones caducan a los 7 días. Como la app solo pide identidad básica (email y perfil, scopes no sensibles), publicar es inmediato y no pasa por la verificación de Google.

## Vercel

Tres variables de entorno en el entorno **Production**:

```
NEXT_PUBLIC_SUPABASE_URL              = https://<ref-prod>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = <publishable key de prod>
NEXT_PUBLIC_SITE_URL                  = https://tu-dominio.vercel.app
```

Son las tres que consume el código: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `proxy.ts` y `app/login/actions.ts`.

Además, la **rama de producción de Vercel es `main`**, no `devel`. `.env.local` se queda con las credenciales de dev y nunca se sube.

Con el dominio ya conocido, falta cerrar el círculo en **dashboard de prod → Authentication → URL Configuration**:

- `Site URL` = `https://tu-dominio.vercel.app`
- `Redirect URLs` = `https://tu-dominio.vercel.app/**`

El patrón con `/**` es necesario porque el callback lleva un `?next=`: la URL completa tiene que encajar en la lista blanca. Está documentado en el comentario de `app/login/actions.ts`.

## Orden de despliegue

Hay un huevo-y-gallina: no conoces el dominio de Vercel hasta el primer despliegue, pero `NEXT_PUBLIC_SITE_URL` lo necesita.

1. `db push` a producción → esquema listo
2. Google Cloud: añadir la URI de callback de prod
3. Dashboard de prod: activar el proveedor Google con el client ID y el secret
4. Primer deploy en Vercel → te da el dominio
5. Con el dominio: las tres variables en Vercel + Site URL y Redirect URLs en Supabase
6. Redeploy y probar el login de punta a punta

## Estado

Hecho:

- [x] CLI instalada, `init`, `login`, `link` a producción
- [x] `db push`: las seis migraciones aplicadas y verificadas en `Volveré`
- [x] URI de callback de prod añadida en Google Cloud Console
- [x] Proveedor Google activado en el dashboard de prod

Pendiente:

- [ ] Comprobar que la pantalla de consentimiento está en _In production_
- [ ] Proyecto en Vercel, rama de producción = `main`
- [ ] Las tres variables de entorno en Vercel
- [ ] Site URL y Redirect URLs en el dashboard de prod
- [ ] Redeploy y probar: login, crear un sitio, subir una foto

## Mantenimiento posterior

Cada cambio de esquema sigue el mismo camino: se escribe como migración en `supabase/migrations/`, se prueba en dev, y se lleva a prod con `supabase db push`. Nunca se toca el esquema de producción a mano desde el dashboard — si se hace, los ficheros dejan de reflejar la realidad y el siguiente push falla o aplica algo incorrecto.
