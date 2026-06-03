# YAML REST — Archivo descriptivo de la Fase 1 del MVP

## 1. Descripción general

Este documento describe la **Fase 1 del MVP** del proyecto **YAML REST**, un paquete npm pensado para desarrolladores frontend que necesitan levantar rápidamente una API REST mock usando un archivo YAML como fuente de datos.

La idea principal es crear una herramienta similar conceptualmente a `json-server`, pero usando un archivo `db.yml` como base persistente de datos.

El paquete debe permitir ejecutar un comando simple como:

```bash
npx yrest serve db.yml
```

Y obtener automáticamente un servidor REST funcional en:

```txt
http://localhost:3070
```

El puerto `3070` se define como valor por defecto por su relación simbólica con la palabra `YAML`:

```txt
YAML = 89 + 65 + 77 + 76 = 307 → 3070
```

---

## 2. Objetivo principal de la Fase 1

El objetivo de esta primera fase es construir el **paquete npm base**, sin panel web, sin playground online y sin funcionalidades avanzadas.

La Fase 1 debe entregar una herramienta CLI ligera, instalable y funcional que permita:

```txt
- Leer un archivo db.yml.
- Detectar recursos definidos en YAML.
- Generar endpoints REST automáticamente.
- Permitir operaciones CRUD completas.
- Persistir cambios en el archivo YAML.
- Ejecutarse desde consola mediante npx.
```

El resultado esperado es que cualquier desarrollador frontend pueda usarlo para probar llamadas REST desde una aplicación React, Angular, Vue, Astro, Svelte u otro frontend sin tener que montar un backend real.

---

## 3. Ejemplo de archivo db.yml

Un archivo inicial podría tener la siguiente estructura:

```yml
users:
  - id: 1
    name: Ana
    email: ana@test.com

  - id: 2
    name: Luis
    email: luis@test.com

posts:
  - id: 1
    title: Primer post
    userId: 1
```

A partir de este YAML, el paquete debe detectar automáticamente las colecciones `users` y `posts`.

---

## 4. Endpoints REST generados automáticamente

A partir del archivo anterior, el paquete debe generar los siguientes endpoints:

```txt
GET     /users
GET     /users/:id
POST    /users
PUT     /users/:id
PATCH   /users/:id
DELETE  /users/:id

GET     /posts
GET     /posts/:id
POST    /posts
PUT     /posts/:id
PATCH   /posts/:id
DELETE  /posts/:id
```

Si el usuario ejecuta el servidor con un `base path`, por ejemplo:

```bash
npx yrest serve db.yml --base /api
```

Los endpoints deberán quedar disponibles como:

```txt
GET     /api/users
GET     /api/users/:id
POST    /api/users
PUT     /api/users/:id
PATCH   /api/users/:id
DELETE  /api/users/:id
```

---

## 5. Métodos REST incluidos en el MVP

La Fase 1 debe cubrir como mínimo los métodos REST principales.

### GET collection

Debe devolver todos los elementos de una colección.

```http
GET /users
```

Respuesta esperada:

```json
[
  {
    "id": 1,
    "name": "Ana",
    "email": "ana@test.com"
  },
  {
    "id": 2,
    "name": "Luis",
    "email": "luis@test.com"
  }
]
```

### GET by id

Debe devolver un recurso concreto por su identificador.

```http
GET /users/1
```

Respuesta esperada:

```json
{
  "id": 1,
  "name": "Ana",
  "email": "ana@test.com"
}
```

Si el recurso no existe, debe responder con `404 Not Found`.

---

### POST

Debe crear un nuevo recurso dentro de una colección.

```http
POST /users
Content-Type: application/json
```

Body:

```json
{
  "name": "Carlos",
  "email": "carlos@test.com"
}
```

Respuesta esperada:

```json
{
  "id": 3,
  "name": "Carlos",
  "email": "carlos@test.com"
}
```

El nuevo recurso debe añadirse al archivo `db.yml`.

---

### PUT

Debe reemplazar completamente un recurso existente.

```http
PUT /users/3
Content-Type: application/json
```

Body:

```json
{
  "id": 3,
  "name": "Carlos Nuevo",
  "email": "nuevo@test.com",
  "role": "user"
}
```

El recurso anterior debe ser sustituido por el nuevo contenido.

---

### PATCH

Debe actualizar parcialmente un recurso existente.

```http
PATCH /users/3
Content-Type: application/json
```

Body:

```json
{
  "role": "admin"
}
```

El resultado esperado sería mantener el resto de campos y modificar solo los campos enviados.

---

### DELETE

Debe eliminar un recurso de una colección.

```http
DELETE /users/3
```

Puede devolver el recurso eliminado o una respuesta `204 No Content`. Para la primera versión, se recomienda devolver el recurso eliminado porque resulta más útil durante el desarrollo frontend.

---

## 6. Comando CLI mínimo

El comando principal de la Fase 1 será:

```bash
npx yrest serve db.yml
```

También debería funcionar si el paquete está instalado localmente:

```bash
npm install -D yrest
```

```bash
npx yrest serve db.yml
```

O mediante un script en `package.json`:

```json
{
  "scripts": {
    "mock:api": "yrest serve db.yml"
  }
}
```

---

## 7. Flags mínimas de la Fase 1

La primera versión debería soportar pocas flags, pero bien definidas.

### --port

Permite modificar el puerto del servidor.

```bash
npx yrest serve db.yml --port 3001
```

Si no se define, se usará:

```txt
3070
```

---

### --host

Permite definir el host de escucha.

```bash
npx yrest serve db.yml --host 0.0.0.0
```

Valor recomendado por defecto:

```txt
localhost
```

---

### --base

Permite definir un prefijo base para todos los endpoints.

```bash
npx yrest serve db.yml --base /api
```

Resultado:

```txt
http://localhost:3070/api/users
http://localhost:3070/api/posts
```

---

## 8. Stack técnico recomendado

Para esta primera etapa no se recomienda usar NestJS como base principal, porque añade una arquitectura más pesada de la necesaria para un mock server CLI.

La recomendación para el MVP es usar una base ligera y moderna:

```txt
TypeScript
Fastify
yaml
commander
zod
tsup
vitest
```

Tabla de responsabilidades:

| Necesidad | Tecnología recomendada |

|---|---|
| Servidor HTTP | Fastify |
| CLI | Commander |
| Lectura/escritura YAML | yaml |
| Validación de opciones/configuración | Zod |
| Build del paquete npm | tsup |
| Tests | Vitest |

Fastify encaja especialmente bien porque es rápido, ligero y tiene buen soporte para TypeScript.

---

## 9. Motivo para no usar NestJS en la Fase 1

NestJS es una gran opción para backends grandes, APIs empresariales o sistemas modulares complejos, pero para este caso inicial puede ser excesivo.

NestJS introduce:

```txt
- Modules
- Controllers
- Providers
- Dependency injection
- Decorators
- Reflect metadata
- Bootstrap más pesado
```

Para una herramienta que debe ejecutarse de forma rápida mediante `npx`, se prioriza una arquitectura más ligera.

NestJS podría ser considerado en una fase posterior si el proyecto evoluciona hacia:

```txt
- Panel web avanzado.
- Sistema complejo de plugins.
- Autenticación simulada.
- Escenarios mockeados.
- Interfaz administrativa.
- Workspaces o proyectos persistentes.
```

---

## 10. Estructura inicial recomendada

Una estructura simple para la Fase 1 podría ser:

```txt
yrest/
├─ src/
│  ├─ cli/
│  │  └─ index.ts
│  │
│  ├─ server/
│  │  ├─ createServer.ts
│  │  └─ registerCrudRoutes.ts
│  │
│  ├─ storage/
│  │  ├─ yamlStorage.ts
│  │  └─ types.ts
│  │
│  ├─ router/
│  │  └─ resourceRouter.ts
│  │
│  ├─ config/
│  │  └─ loadOptions.ts
│  │
│  └─ index.ts
│
├─ tests/
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## 11. Responsabilidad de cada módulo

### cli/

La carpeta `cli` se encargará de recibir y procesar los comandos del usuario.

Ejemplo:

```bash
yrest serve db.yml --port 3070 --base /api
```

Responsabilidades:

```txt
- Parsear argumentos.
- Validar opciones básicas.
- Resolver la ruta del archivo YAML.
- Arrancar el servidor.
- Mostrar mensajes útiles en consola.
```

---

### storage/

La carpeta `storage` se encargará de gestionar la lectura y escritura del archivo YAML.

Responsabilidades:

```txt
- Leer db.yml.
- Parsear el contenido YAML.
- Mantener una copia en memoria.
- Guardar cambios tras POST, PUT, PATCH y DELETE.
- Controlar errores de sintaxis YAML.
```

En esta fase inicial, la persistencia puede ser simple, pero debería evitar escrituras corruptas.

Una estrategia recomendable es:

```txt
1. Actualizar datos en memoria.
2. Escribir en un archivo temporal.
3. Reemplazar el archivo original.
```

---

### server/

La carpeta `server` contendrá la creación del servidor HTTP.

Responsabilidades:

```txt
- Crear instancia de Fastify.
- Registrar middlewares básicos.
- Activar CORS.
- Registrar rutas CRUD.
- Escuchar en el puerto configurado.
```

---

### router/

La carpeta `router` se encargará de detectar recursos y generar rutas CRUD.

Ejemplo:

```yml
users: []
products: []
```

Debe generar automáticamente:

```txt
/users
/users/:id
/products
/products/:id
```

Responsabilidades:

```txt
- Detectar colecciones en el YAML.
- Registrar rutas por cada colección.
- Resolver búsquedas por id.
- Delegar escrituras al storage.
```

---

### config/

La carpeta `config` puede encargarse de normalizar y validar opciones de ejecución.

Responsabilidades:

```txt
- Definir puerto por defecto.
- Definir host por defecto.
- Normalizar base path.
- Validar flags recibidas por CLI.
```

---

## 12. Persistencia mínima

Las operaciones de escritura deben actualizar el archivo `db.yml`.

Operaciones que modifican el archivo:

```txt
POST
PUT
PATCH
DELETE
```

Ejemplo:

```http
POST /users
```

Body:

```json
{
  "name": "Carlos"
}
```

Debe generar en memoria:

```json
{
  "id": 3,
  "name": "Carlos"
}
```

Y actualizar `db.yml`:

```yml
users:
  - id: 1
    name: Ana
  - id: 2
    name: Luis
  - id: 3
    name: Carlos
```

---

## 13. Estrategia de ID automático

Para la Fase 1 se recomienda una estrategia sencilla:

```txt
- Si el recurso enviado ya tiene id, se respeta.
- Si no tiene id, se genera el siguiente número incremental.
```

Ejemplo:

```yml
users:
  - id: 1
    name: Ana
  - id: 2
    name: Luis
```

Si se hace un `POST /users` sin `id`, se genera:

```txt
id: 3
```

En fases posteriores se podrían añadir otras estrategias:

```txt
- UUID
- nanoid
- string ids
- custom id field
```

---

## 14. Comportamiento HTTP recomendado

La Fase 1 debería definir respuestas claras y previsibles.

```txt
200 OK          GET, PUT, PATCH exitosos
201 Created     POST exitoso
204 No Content  opcional para DELETE
400 Bad Request body inválido
404 Not Found   recurso o id inexistente
500 Error       error interno o error leyendo/escribiendo YAML
```

Para `DELETE`, se recomienda devolver inicialmente `200 OK` con el recurso eliminado porque facilita la depuración durante el desarrollo frontend.

---

## 15. Comportamiento inicial recomendado

En esta primera fase, el paquete debería tener estas decisiones por defecto:

```txt
- Puerto por defecto: 3070
- Host por defecto: localhost
- CORS activado por defecto
- Respuestas en JSON
- Content-Type: application/json
- ID incremental automático
- Persistencia directa en db.yml
- 404 si la colección no existe
- 404 si el id no existe
- 400 si el body es inválido
```

---

## 16. Ejemplo de uso desde frontend

Desde una aplicación frontend se podría consumir la API así:

```ts
const response = await fetch("http://localhost:3070/users");
const users = await response.json();
```

Con base path:

```ts
const response = await fetch("http://localhost:3070/api/users");
const users = await response.json();
```

Crear un recurso:

```ts
await fetch("http://localhost:3070/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Carlos",
    email: "carlos@test.com",
  }),
});
```

Actualizar parcialmente:

```ts
await fetch("http://localhost:3070/users/1", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Ana Actualizada",
  }),
});
```

Eliminar:

```ts
await fetch("http://localhost:3070/users/1", {
  method: "DELETE",
});
```

---

## 17. Fuera del alcance de la Fase 1

Para evitar que el MVP crezca demasiado, estas funcionalidades deben quedar fuera de la primera fase:

```txt
- Panel web.
- Playground online.
- Proxy fallback.
- Custom routes.
- Autenticación mockeada.
- Validaciones avanzadas por schema.
- OpenAPI.
- Escenarios.
- Latencia simulada.
- Errores simulados.
- Subida de archivos.
- Relaciones avanzadas.
- Paginación avanzada.
- Sorting avanzado.
- Filtros complejos.
- Modo snapshot.
- Modo readonly.
```

Algunas de estas funcionalidades pueden entrar en fases posteriores.

---

## 18. Resultado esperado de la Fase 1

Al finalizar esta etapa, el proyecto debería permitir publicar una primera versión funcional del paquete npm.

Instalación:

```bash
npm install -D yrest
```

Ejecución:

```bash
npx yrest serve db.yml
```

Resultado:

```txt
yrest running at http://localhost:3070
```

Uso desde frontend:

```ts
const response = await fetch("http://localhost:3070/users");
const users = await response.json();
```

Resumen de la entrega:

```txt
La Fase 1 debe entregar un paquete npm CLI, ligero y funcional, capaz de levantar una API REST CRUD completa desde un archivo db.yml usando el puerto 3070 por defecto.
```

---

## 19. Fases sucesivas previstas

Aunque este documento se centra en la Fase 1, el proyecto puede evolucionar en varias fases posteriores.

## Fase 2 — Mejoras REST y experiencia CLI

Objetivo: hacer que el mock server sea más cómodo y potente para desarrollo diario.

Posibles funcionalidades:

```txt
- Query params.
- Filtros simples.
- Paginación.
- Sorting.
- Watch mode.
- Readonly mode.
- Snapshot mode.
- Delay global.
- Mejor gestión de errores.
- Archivo de configuración mock.config.yml.
```

Ejemplo futuro:

```bash
npx yrest serve db.yml --watch --readonly
```

---

## Fase 3 — Proxy fallback

Objetivo: permitir trabajar con una API híbrida: algunas rutas mockeadas y otras reales.

Ejemplo:

```bash
npx yrest serve db.yml --base /api --proxy https://app.domain
```

Comportamiento esperado:

```txt
1. Buscar la ruta en custom routes.
2. Buscar el recurso en db.yml.
3. Si no existe, reenviar la petición al proxy.
4. Si no hay proxy, devolver 404.
```

Esto permitiría:

```txt
http://localhost:3070/api/users
```

Responder desde YAML, y:

```txt
http://localhost:3070/api/orders
```

Reenviar a:

```txt
https://app.domain/api/orders
```

---

## Fase 4 — Custom routes

Objetivo: permitir definir endpoints que no encajan en CRUD.

Ejemplos:

```txt
POST /login
POST /logout
GET /auth/me
GET /dashboard/stats
POST /checkout
```

Posible estructura:

```yml
_routes:
  - method: GET
    path: /auth/me
    response:
      status: 200
      body:
        id: 1
        name: Ana
        role: admin
```

---

## Fase 5 — Panel local

Objetivo: permitir lanzar un panel visual desde el propio paquete.

Ejemplo:

```bash
npx yrest serve db.yml --panel
```

Ruta del panel:

```txt
http://localhost:3070/_panel
```

Funcionalidades posibles:

```txt
- Ver el contenido de db.yml.
- Editar YAML desde navegador.
- Guardar cambios.
- Ver recursos detectados.
- Probar endpoints GET, POST, PUT, PATCH y DELETE.
- Ver respuestas.
- Ver errores de YAML.
- Copiar ejemplos de fetch, axios y curl.
```

---

## Fase 6 — Web pública y documentación

Objetivo: crear una página pública del proyecto con documentación y playground.

Posibles secciones:

```txt
- Home.
- Getting Started.
- CLI.
- YAML Format.
- REST Methods.
- Query Params.
- Proxy.
- Panel.
- Playground.
- Examples.
- API Reference.
```

La web pública puede incluir un playground online que simule el comportamiento del servidor desde el navegador, sin tocar archivos reales del usuario.

---

## Fase 7 — API programática y testing frontend

Objetivo: permitir usar el servidor directamente desde tests automatizados.

Ejemplo:

```ts
import { createYrestServer } from "yrest";

const server = await createYrestServer({
  file: "./tests/db.yml",
  port: 3070,
});

await server.start();
```

Casos de uso:

```txt
- Vitest.
- Playwright.
- Cypress.
- Storybook.
- Tests de integración frontend.
```

---

## Fase 8 — Validaciones, escenarios y extensibilidad

Objetivo: llevar el proyecto hacia un mock server más avanzado.

Funcionalidades posibles:

```txt
- Validaciones con JSON Schema o Zod.
- Escenarios mockeados.
- Respuestas condicionales.
- Errores simulados.
- Latencia por endpoint.
- Plugins.
- Workspaces.
- Múltiples archivos db.yml.
- Estrategias de id configurables.
```

---

## 20. Cierre

La prioridad de la Fase 1 debe ser construir una base pequeña, sólida y mantenible.

Antes de añadir panel web, proxy, playground o features avanzadas, el paquete debe cumplir bien su promesa principal:

```txt
Levantar una API REST CRUD completa desde un archivo YAML en segundos.
```

Esa debe ser la identidad inicial del proyecto.
