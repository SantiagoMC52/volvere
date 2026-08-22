# Volveré 🍽️

Web personal para guardar restaurantes (y sitios en general) que quiero recordar — para bien o para mal. Pensada para resolver el típico problema de: "quiero volver a ese sitio pero no recuerdo el nombre, el menú, o si de verdad estaba bueno".

---

## 1. Objetivo del proyecto

- Guardar un listado de restaurantes/sitios visitados con su información clave.
- Consultar el detalle de cada uno cuando quiera recordar si volver.
- Uso principal: personal, pero preparado para que amigos puedan tener su propia cuenta y su propio listado (o compartido, a decidir).
- No se integra con Google Maps ni servicios similares — la ubicación, si se añade, es texto libre o un enlace externo puesto a mano.

---

## 2. Stack técnico

| Capa                       | Tecnología                       | Motivo                                                                                                                            |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend + Backend         | **Next.js** (App Router, v14/15) | Server Components para leer datos sin boilerplate, Server Actions para el formulario de alta, todo en un mismo proyecto           |
| Base de datos              | **Supabase (Postgres)**          | Base de datos relacional gestionada, gratis para este volumen de uso                                                              |
| Autenticación              | **Supabase Auth**                | Login con magic link o Google OAuth, integrado con la base de datos vía Row Level Security (RLS)                                  |
| Almacenamiento de imágenes | **Supabase Storage**             | Mismo sistema de permisos que la base de datos y el login                                                                         |
| Estilos                    | **Tailwind CSS**                 | Estándar actual para Next.js, utilidades CSS sin salir del componente                                                             |
| Componentes UI             | **shadcn/ui**                    | Componentes (cards, dialogs, forms, inputs) que se copian al proyecto y se personalizan libremente, no es una dependencia cerrada |
| Despliegue                 | **Vercel**                       | Gratis para este uso, integración nativa con Next.js                                                                              |

---

## 3. Funcionalidades principales

### 3.1 Listado de sitios

- Vista tipo tarjetas (grid), con nombre y un indicador rápido de "¿Volver?". Sin foto: las imágenes se ven solo en el detalle, así el listado no paga una firma de URL por sitio en cada carga.
- (Pendiente) Filtro rápido por estado: 👍 Sí volvería / 👎 No volvería / 🤔 Tal vez.
- (Opcional futuro) Buscador por nombre y filtro por tags/tipo.

### 3.2 Detalle de sitio

- Nombre
- Descripción libre (notas, qué pedí, qué tal estuvo, etc.)
- Ubicación (texto libre, opcional — sin integración de mapas)
- Teléfono (opcional, enlace `tel:` para llamar directo desde el móvil)
- URL externa (opcional, si el sitio tiene web propia)
- Galería de imágenes
- Estado "¿Volver?" (Sí / No / Tal vez)

### 3.3 Alta de sitio

Formulario con:

- Nombre (obligatorio)
- Descripción
- Ubicación (texto libre, opcional)
- Teléfono (opcional)
- URL (opcional)
- Subida de una o varias imágenes
- Selector "¿Volver?" (Sí / No / Tal vez)

### 3.4 Autenticación

- Login vía Supabase Auth (magic link o Google, a decidir).
- Cada usuario ve y gestiona su propio listado mediante Row Level Security.
- (Opcional futuro) Posibilidad de compartir listados entre amigos.

---

## 4. Modelo de datos (borrador)

**Tabla `places`**

| Campo          | Tipo                        | Notas                       |
| -------------- | --------------------------- | --------------------------- |
| `id`           | uuid                        | PK                          |
| `user_id`      | uuid                        | FK a `auth.users`, para RLS |
| `name`         | text                        | obligatorio                 |
| `description`  | text                        | opcional                    |
| `location`     | text                        | opcional, texto libre       |
| `phone`        | text                        | opcional                    |
| `url`          | text                        | opcional                    |
| `would_return` | enum (`yes`, `no`, `maybe`) |                             |
| `created_at`   | timestamp                   |                             |

**Tabla/bucket `place_images`**

- Imágenes almacenadas en Supabase Storage, referenciadas por `place_id`.

---

## 5. Estructura de proyecto (Next.js App Router, orientativa)

```
app/
  layout.tsx
  page.tsx                → listado
  places/
    [id]/
      page.tsx             → detalle
    nuevo/
      page.tsx             → formulario de alta
  login/
    page.tsx
lib/
  supabase/
    client.ts
    server.ts
components/
  ui/                      → componentes shadcn/ui
  PlaceCard.tsx
  PlaceForm.tsx
  WouldReturnBadge.tsx
```

---

## 6. Roadmap sugerido

1. Configurar proyecto Next.js + Tailwind + shadcn/ui.
2. Crear proyecto Supabase, definir tabla `places` y bucket de imágenes, activar RLS.
3. Implementar login (Supabase Auth).
4. Implementar listado (Server Component leyendo de Supabase).
5. Implementar detalle.
6. Implementar formulario de alta con subida de imágenes (Server Action).
7. Desplegar en Vercel.
8. (Futuro) Filtros/búsqueda, tags de tipo de cocina, compartir listados entre amigos.

---

## 7. Nombre

**Volveré** — porque la app no solo guarda sitios buenos para repetir, también sirve para recordar (y evitar) los que no.
