# Desplegar Next.js + Supabase en Vercel

Guía de cómo se lleva una aplicación Next.js con Supabase a producción, y cómo se le aplican cambios de esquema una vez está viva. Escrita a partir de [Volveré](./README.md), pero pensada para servir en cualquier proyecto con el mismo montaje.

## El modelo mental

A producción tienen que viajar tres cosas, y **cada una va por un camino distinto**:

| Qué                                                     | Cómo viaja                                         |
| ------------------------------------------------------- | -------------------------------------------------- |
| Esquema: tablas, RLS, buckets y sus políticas           | Migraciones SQL, con la CLI de Supabase            |
| Configuración de Auth: proveedores, URLs de redirección | **A mano**, en el panel del proyecto de producción |
| Credenciales de la aplicación                           | Variables de entorno en Vercel                     |

La segunda es la que pilla por sorpresa. Un proyecto de Supabase de producción es un proyecto **completamente separado** del de desarrollo: no sabe nada de tu cliente de Google OAuth ni de tus URLs de redirección. Eso no vive en ningún fichero SQL y `db push` no lo lleva.

## Dos proyectos, no dos ramas

Merece la pena crear **dos proyectos de Supabase separados** en lugar de usar ramas de uno solo, sobre todo si trabajas con agentes o servidores MCP: así puedes darles acceso al de desarrollo sin que exista ningún camino hacia los datos reales.

El coste es que hay dos de todo — dos configuraciones de Auth, dos juegos de credenciales — y que las migraciones hay que aplicarlas dos veces.

A lo largo del documento, `<ref-dev>` y `<ref-prod>` son los identificadores de cada proyecto. Los tienes en la URL de su panel, o listados con:

```bash
pnpm supabase projects list
```

La columna `linked` indica cuál tiene enlazada la CLI ahora mismo.

## La CLI de Supabase

Conviene instalarla como dependencia de desarrollo, no global: así la versión queda fijada en el repositorio y no depende de la máquina. Entonces cada comando es `pnpm supabase ...`.

| Comando                              | Qué hace                                                  |
| ------------------------------------ | --------------------------------------------------------- |
| `supabase init`                      | Crea `supabase/config.toml` y `supabase/.gitignore`       |
| `supabase login`                     | Autentica la CLI con tu cuenta. Una vez por máquina       |
| `supabase link --project-ref <ref>`  | Enlaza la carpeta con un proyecto remoto                  |
| `supabase db push`                   | Aplica las migraciones que le falten al proyecto enlazado |
| `supabase db query --linked "<sql>"` | Ejecuta SQL contra el proyecto enlazado                   |

Dos detalles que ahorran un rato:

- **`--project-ref` no sirve para apuntar a un proyecto que no esté enlazado.** Solo cualifica a `--linked`. Incluso una consulta de solo lectura contra el otro entorno obliga a reenlazar.
- En una terminal no interactiva, `link --password ""` y `db push --yes` evitan que los comandos se queden esperando una respuesta.

### El riesgo real: no saber a cuál apuntas

El proyecto enlazado se guarda en `supabase/.temp/linked-project.json`, que está **ignorado por git**. El repositorio no deja constancia de a cuál apuntas, así que un `db push` distraído puede acabar en producción.

De ahí que el procedimiento de abajo empiece y termine con lo mismo: comprobar dónde estás.

## Aplicar una migración a producción

`db push` compara las versiones de `supabase/migrations/` con la tabla `supabase_migrations.schema_migrations` del proyecto enlazado y aplica las que falten, en orden. Los **nombres de fichero son la fuente de verdad**: compara el timestamp del nombre contra lo registrado en el remoto. Si alguna vez aplicas una migración por otra vía, asegúrate de que el fichero local acabe con la versión que quedó registrada.

**1. Comprobar dónde estás.**

```bash
pnpm supabase projects list
```

**2. Comprobar los datos que ya hay.** Este paso solo aplica si la migración añade restricciones, y es el que evita el susto: un `check` nuevo se valida contra **todas** las filas existentes, así que una sola que incumpla tumba el `ALTER TABLE`. Cuenta primero cuántas filas violarían cada regla nueva. Si algún contador no es cero, para y decide qué hacer con esas filas antes de seguir.

**3. Enlazar producción.**

```bash
pnpm supabase link --project-ref <ref-prod>
```

Pide la contraseña de la base de datos; se puede dejar vacía, porque `db push` va por la API de gestión y no la necesita.

**4. Ensayar.**

```bash
pnpm supabase db push --dry-run
```

Aquí confirmas que estás donde crees. Debería listar solo lo que esperas. Si aparecen migraciones antiguas, producción va por detrás de desarrollo: no es un problema en sí, se aplicarán en orden, pero mejor saberlo antes que a mitad.

**5. Aplicar.**

```bash
pnpm supabase db push
```

Es transaccional: si algo choca con los datos existentes, se revierte entera y Postgres dice qué restricción falló y con qué fila.

**6. Verificar.** Que la CLI diga "aplicada" no es lo mismo que comprobar que hizo lo que querías. Para restricciones, `pg_constraint` las lista con su definición. Si quieres confirmar que además **rechazan**, un `insert` inválido dentro de una transacción con `rollback` te lo demuestra sin dejar rastro.

**7. Volver a desarrollo.** No te saltes este paso.

```bash
pnpm supabase link --project-ref <ref-dev>
pnpm supabase projects list
```

Si dejas el enlace en producción, el próximo `db push` que hagas sin mirar se va allí.

### Migraciones que estrechan

Una migración que **quita** margen — reduce un límite, restringe los tipos aceptados por un bucket — tiene una ventana peligrosa que las que amplían no tienen. Entre aplicarla y desplegar el código nuevo, producción sirve código viejo contra un esquema que ya no lo acepta.

Ningún orden lo evita: aplicarla después deja la ventana contraria. La única vía sin caída es un par de migraciones ampliar-y-luego-estrechar alrededor del despliegue, que casi nunca compensa. Lo importante es **saber que la ventana existe** y elegirla a una hora tranquila.

## Google OAuth

Un **único cliente OAuth** en Google Cloud sirve para los dos entornos: admite varias URIs de redirección autorizadas.

```
https://<ref-dev>.supabase.co/auth/v1/callback
https://<ref-prod>.supabase.co/auth/v1/callback
```

Se **añaden**, no se sustituyen. Por eso el mismo client ID y el mismo secret se pegan en los dos proyectos de Supabase, en _Authentication → Sign In / Providers → Google_.

Puntos que se atascan:

- **Las credenciales apuntan a Supabase, no a tu dominio.** La redirección autorizada es `https://<ref>.supabase.co/auth/v1/callback`. "Orígenes autorizados de JavaScript" se deja vacío: el navegador nunca llama a Google desde tu dominio.
- **La pantalla de consentimiento tiene que estar publicada** (_In production_), no en _Testing_. En pruebas solo entran las cuentas listadas como usuarios de prueba y las sesiones caducan a los siete días. Si solo pides identidad básica (`openid`, `email`, `profile`), publicar es inmediato y no pasa por la verificación de Google.
- **Las URLs de redirección de Supabase necesitan comodín** si tu callback lleva parámetros: `https://tu-dominio/**`. Una entrada exacta rechaza una URL con `?next=...`.
- **Para cerrar el registro** y que la aplicación quede en las cuentas que ya existen, el interruptor está en _Authentication → Sign In / Providers → "Allow new users to sign up"_. Es una puerta más fuerte que volver la pantalla de Google a modo prueba. Supabase devuelve entonces `error_code=signup_disabled`, que conviene tratar explícitamente en la ruta de callback.

**El MCP de Supabase no tiene herramientas para la configuración de Auth**: proveedores, plantillas, límites y URLs de redirección son solo panel. Esos pasos siempre son a mano.

## Vercel

Las variables de entorno del proyecto, en el entorno **Production**:

```
NEXT_PUBLIC_SUPABASE_URL              = https://<ref-prod>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = <clave publicable de producción>
NEXT_PUBLIC_SITE_URL                  = https://tu-dominio
```

Comprueba también cuál es la **rama de producción** de Vercel: por defecto es `main`, y si trabajas sobre otra rama de integración no se desplegará sola.

### El huevo y la gallina del dominio

Hay una dependencia circular: no conoces el dominio hasta el primer despliegue, pero la configuración lo necesita. El orden que la deshace:

1. `db push` a producción, para que el esquema esté listo.
2. Google Cloud: añadir la URI de callback de producción.
3. Panel de Supabase de producción: activar el proveedor con el client ID y el secret.
4. Primer despliegue en Vercel, que te da el dominio.
5. Ya con el dominio: las variables de entorno en Vercel, y _Site URL_ y _Redirect URLs_ en Supabase.
6. Redesplegar y probar el login de punta a punta.

## Reglas que no caducan

- **El esquema de producción no se toca a mano** desde el panel. Si se hace, los ficheros dejan de reflejar la realidad y el siguiente `push` falla o aplica algo incorrecto.
- **Cualquier release que lleve una migración la necesita aplicada antes** de que el código se despliegue, o la aplicación se encuentra un esquema que todavía no acepta lo que envía.
- **Comprueba el proyecto enlazado antes de cada push**, y vuelve a desarrollo después.
- **En producción puede no estar solo tu propio usuario.** En cuanto la aplicación tiene otra cuenta dentro, una migración destructiva deja de ser un experimento sobre tus datos.
