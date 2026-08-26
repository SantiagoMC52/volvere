# Volveré 🍽️

Web personal para guardar restaurantes y sitios que quiero recordar — para saber si volver o no. Resuelve el problema de siempre: "quiero volver a ese sitio pero no me acuerdo del nombre, ni de qué pedí, ni de si de verdad estaba bueno".

Cada usuario entra con su cuenta de Google y ve únicamente sus sitios.

## Qué hace

**Listado.** Tarjetas con el nombre, las primeras líneas de las notas y el estado. Buscador insensible a mayúsculas y acentos (`cordoba` encuentra `Córdoba`), filtro por estado y tres órdenes: más recientes, más antiguos o primero los que sí. El estado de la vista viaja en la URL, así que se puede compartir o guardar en favoritos.

**Detalle.** Notas, ubicación, teléfono, web y galería de fotos. La ubicación admite una dirección escrita a mano o un enlace pegado de Google Maps, y en los dos casos acaba llevando a un mapa. Caben dos teléfonos —fijo y móvil—, cada uno como enlace `tel:` para llamar desde el móvil. Bajo el título, la fecha en que se guardó el sitio.

**Alta, edición y borrado** en un diálogo, sin cambiar de página. El botón de guardar está inactivo mientras no haya un cambio real, así que abrir un sitio para mirarlo y cerrarlo no reescribe la fila.

**Fotos.** Hasta cinco por sitio. Se comprimen en el navegador a JPEG de 1600 px antes de subirse — una foto de móvil de 4 MB se queda en unos 300 KB — y se suben directamente a Storage, sin pasar por el servidor. Los HEIC de iPhone se convierten en el propio navegador.

## Stack

| Capa               | Tecnología                         | Por qué                                                                            |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------- |
| Frontend y backend | Next.js 16 (App Router) + React 19 | Server Components para leer datos sin API intermedia, Server Actions para escribir |
| Base de datos      | Supabase (Postgres)                | Relacional gestionada, con Row Level Security integrada con el login               |
| Autenticación      | Supabase Auth + Google OAuth       | Sin contraseñas que guardar ni correos que enviar                                  |
| Fotos              | Supabase Storage                   | Mismo sistema de permisos que la base de datos                                     |
| Estilos            | Tailwind CSS 4                     |                                                                                    |
| Componentes        | shadcn/ui sobre Base UI            | Se copian al proyecto y se editan; no es una dependencia cerrada                   |
| Despliegue         | Vercel                             | Integración nativa con Next.js                                                     |

## Cómo se protegen los datos

Tres capas independientes, y ninguna sustituye a otra:

- **Row Level Security** en Postgres. Cada consulta queda restringida a las filas del usuario autenticado, así que ni un fallo en el código puede devolver los sitios de otra persona. Las políticas de `place_images` saltan a `places` para comprobar la propiedad, y el bucket usa la misma regla sobre la ruta del objeto.
- **Validación en el servidor.** Todo lo que llega a una Server Action se valida con un esquema de Zod antes de tocar la base de datos. Los límites del formulario son una cortesía para quien escribe, no una defensa.
- **Restricciones en la tabla.** Longitudes y formatos también como `check` en Postgres, para cualquier escritura que no pase por la aplicación.

El middleware (`proxy.ts` en Next 16) refresca el token y redirige rutas privadas, pero es una comprobación **optimista**: lo que protege de verdad es el `getUser()` de cada página y las políticas RLS.

## Modelo de datos

**`public.places`**

| Campo             | Tipo        | Notas                                                               |
| ----------------- | ----------- | ------------------------------------------------------------------- |
| `id`              | uuid        | PK                                                                  |
| `user_id`         | uuid        | FK a `auth.users`, en cascada. Indexado: sostiene las políticas RLS |
| `name`            | text        | Obligatorio, 1–50 caracteres                                        |
| `description`     | text        | Opcional, ≤ 400                                                     |
| `location`        | text        | Opcional, ≤ 500. Texto libre: dirección o enlace                    |
| `phone`           | text        | Opcional, 6–15 dígitos sin prefijo ni separadores                   |
| `phone_secondary` | text        | Opcional, mismo formato que `phone`. Independiente de él            |
| `url`             | text        | Opcional, ≤ 500                                                     |
| `would_return`    | enum        | `yes` / `no` / `maybe`                                              |
| `created_at`      | timestamptz |                                                                     |

**`public.place_images`** — índice de las fotos; los bytes viven en Storage.

| Campo          | Tipo        | Notas                                                          |
| -------------- | ----------- | -------------------------------------------------------------- |
| `id`           | uuid        | PK                                                             |
| `place_id`     | uuid        | FK a `places`, en cascada                                      |
| `storage_path` | text        | Único. Siempre `{user_id}/{place_id}/{uuid}.jpg`               |
| `sort_order`   | smallint    | 0–4, único por sitio: es lo que topa cada sitio en cinco fotos |
| `created_at`   | timestamptz |                                                                |

**Bucket `place-images`** — privado, solo `image/jpeg`, con políticas por propietario sobre la ruta. Las URLs que sirve son firmadas y caducan.

Guardar las fotos de un sitio reescribe sus filas (borrar más insertar), nunca las edita, así que la tabla no tiene permiso de `update`.

## Estructura

```
app/
  layout.tsx              cabecera, fuentes, toasts
  page.tsx                listado
  places/[id]/page.tsx    detalle
  places/actions.ts       Server Actions: crear, editar, borrar
  login/                  página y acción de login
  auth/callback/route.ts  vuelta de Google, intercambio del código
components/
  places/                 tarjetas, diálogo de alta/edición, galería
  ui/                     componentes shadcn/ui
lib/
  supabase/               clientes de navegador y servidor
  places.ts               consultas a la tabla
  place-schema.ts         validación con Zod (solo servidor)
  place-limits.ts         longitudes máximas, compartidas con el formulario
  images.ts               compresión y límites de las fotos
proxy.ts                  refresco de sesión y guarda de rutas
supabase/migrations/      esquema versionado
```

## Desarrollo

```bash
pnpm install
pnpm dev
```

En [http://localhost:3000](http://localhost:3000). Hace falta un `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Scripts

| Comando                                 | Qué hace                       |
| --------------------------------------- | ------------------------------ |
| `pnpm dev`                              | Servidor de desarrollo         |
| `pnpm build` / `pnpm start`             | Build y arranque en producción |
| `pnpm lint` / `pnpm lint:fix`           | ESLint                         |
| `pnpm prettier` / `pnpm prettier:check` | Formateo                       |
| `pnpm typescript:check`                 | Comprobación de tipos          |

Un hook de `pre-commit` ejecuta formateo, tipos y lint sobre todo el proyecto, y `commit-msg` valida el mensaje contra Conventional Commits.

### Supabase MCP

`.mcp.json` viaja en el repositorio y apunta el servidor MCP de Supabase al proyecto de **desarrollo**, con su ref en la propia URL.

Es deliberado, y es la regla: **ese ref no se cambia nunca por el de producción**. Es la razón de que haya dos proyectos separados en vez de dos ramas de uno — así un agente puede leer y modificar el esquema de desarrollo sin que exista ningún camino hacia los datos reales. La CLI es la herramienta que sí toca producción; el MCP, nunca. El porqué está en [despliegue-produccion.md](./despliegue-produccion.md).

Conviene además no darle aprobación automática a sus acciones. Lo que hay en la base de datos es texto que escribió alguien, y puede llevar instrucciones dentro; RLS protege los datos, pero no protege de eso.

### Ficheros de agente

Parte del repositorio es configuración para asistentes de código. Conviene saber qué es cada cosa antes de borrar nada:

- **`AGENTS.md`** lo reescribe `next dev` en cada arranque, y `CLAUDE.md` es solo un puntero a él. Borrarlo no sirve: vuelve al siguiente arranque, así que si aparece en un diff, va con el commit.
- **`.claude/skills/`** son las instrucciones que sigue Claude Code en tareas repetidas. `commit-message` es propia. `supabase` y `supabase-postgres-best-practices` son enlaces a `.agents/skills/`, copiadas de [supabase/agent-skills](https://github.com/supabase/agent-skills) y fijadas por hash en `skills-lock.json`: esas no se editan a mano, se actualizan desde el origen.

### Cambios de esquema

Nunca se toca el esquema desde el panel de Supabase. Cada cambio se escribe como migración en `supabase/migrations/`, se prueba en el proyecto de desarrollo y se lleva a producción con la CLI. El procedimiento completo está en [despliegue-produccion.md](./despliegue-produccion.md).

## Ideas pendientes

- Etiquetas por tipo de cocina.
- Compartir listados entre cuentas.
- Mensajes de error por campo en el formulario, aprovechando que el esquema ya los devuelve.

---

**Volveré** — porque no solo guarda los sitios buenos para repetir; también sirve para recordar (y evitar) los que no.
