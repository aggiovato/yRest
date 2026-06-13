# yRest / yaml-rest — Recomendaciones para mejorar descubrimiento, posicionamiento y adopción

## 1. Objetivo del documento

Este documento recoge únicamente las recomendaciones tratadas sobre el paquete **`@aggiovato/yrest`** / **yRest** / **yaml-rest**, con el objetivo de mejorar su descubrimiento en **npm**, **GitHub**, buscadores y herramientas de recomendación, y aumentar la probabilidad de que otros desarrolladores lo encuentren, lo prueben y lo adopten.

El paquete se debe posicionar como una herramienta para crear una **REST API mock desde YAML**, especialmente útil en desarrollo frontend, pruebas y prototipado.

La idea central que conviene repetir en todos los canales es:

> **yRest is a YAML-powered json-server alternative.**

En español:

> **yRest es una alternativa a json-server basada en YAML.**

Ese posicionamiento es importante porque muchos usuarios no buscarán directamente “yRest”, sino términos como:

```text
yaml rest mock server
yaml mock api
mock api from yaml
fake backend yaml
json-server yaml alternative
db.yml rest api
crud mock server yaml
yaml-powered json-server
```

Por eso, el objetivo no es solo que el nombre exista en npm, sino que el paquete aparezca cuando alguien busca el problema que resuelve.

---

## 2. Problema detectado

Durante la conversación se identificaron varios puntos clave:

1. El paquete existe como **`@aggiovato/yrest`**.
2. El nombre corto **`yrest`** sería ideal para marca y uso por CLI, pero npm puede bloquear su publicación unscoped por parecerse a otros nombres populares como `jest`.
3. El paquete todavía necesita más señales públicas para que npm, GitHub, buscadores y asistentes lo reconozcan como una opción relevante.
4. La categoría en la que debe competir no es solo “YAML server”, sino principalmente:
   - mock REST API server
   - fake backend
   - json-server alternative
   - YAML-based CRUD API
   - frontend testing/prototyping tool

La estrategia debe ir en dos direcciones:

- Mantener la marca **yRest**.
- Optimizar todo el ecosistema público para que el paquete sea encontrado por búsquedas genéricas.

---

## 3. Posicionamiento recomendado

### 3.1. Frase principal de producto

Usar una frase corta, repetida y reconocible:

```text
yRest — YAML-powered json-server alternative for mock REST APIs.
```

Alternativas válidas:

```text
Zero-config YAML REST API mock server.
```

```text
Create a full CRUD fake backend from a simple db.yml file.
```

```text
Mock REST APIs from YAML for frontend development, testing and prototyping.
```

La más potente para descubrimiento sería:

```text
YAML-powered json-server alternative. Create a zero-config REST API mock server with full CRUD from a db.yml file.
```

### 3.2. Qué debe entender el usuario en 5 segundos

Al entrar en npm o GitHub, el usuario debería entender inmediatamente:

- Qué es: un mock REST API server.
- Qué usa como fuente: YAML / `db.yml`.
- Qué genera: endpoints REST CRUD.
- Para quién es: frontend developers, testers, prototyping.
- Contra qué compite: `json-server`, `yaml-server`, Mockoon, Prism.

### 3.3. Mensaje conceptual

El mensaje más claro sería:

```text
Think json-server, but powered by YAML.
```

O:

```text
Like json-server, but YAML-first, with relations, filters, pagination, snapshots and custom routes.
```

---

## 4. Mejoras en `package.json`

El `package.json` es una de las piezas más importantes para npm search. Hay que optimizar especialmente:

- `name`
- `description`
- `keywords`
- `bin`
- `repository`
- `homepage`
- `bugs`
- `funding`, si aplica
- `license`
- `engines`

### 4.1. Nombre del paquete

Actualmente el nombre scoped **`@aggiovato/yrest`** es correcto y evita el bloqueo de nombres similares.

```json
{
  "name": "@aggiovato/yrest"
}
```

Aunque el nombre ideal de uso sea `yrest`, el package scoped es una vía segura y legítima.

### 4.2. Descripción recomendada

La descripción debería contener términos buscables. Propuesta:

```json
{
  "description": "YAML-powered json-server alternative. Create a zero-config REST API mock server with full CRUD from a db.yml file."
}
```

Otra opción más compacta:

```json
{
  "description": "Zero-config YAML REST API mock server and json-server alternative for CRUD fake backends from db.yml."
}
```

Evitar descripciones demasiado genéricas como:

```text
YAML REST server
```

porque no explican suficientemente el valor ni capturan búsquedas relevantes.

### 4.3. Keywords recomendadas

Propuesta amplia de keywords:

```json
{
  "keywords": [
    "yrest",
    "yaml-rest",
    "yaml",
    "yml",
    "db.yml",
    "rest",
    "rest-api",
    "mock",
    "mock-api",
    "mock-server",
    "fake-api",
    "fake-backend",
    "crud",
    "json-server",
    "json-server-alternative",
    "yaml-server",
    "api-mock",
    "frontend",
    "frontend-development",
    "testing",
    "prototyping",
    "fastify",
    "typescript",
    "cli"
  ]
}
```

Palabras especialmente importantes:

```text
json-server
yaml
mock-api
mock-server
fake-backend
crud
db.yml
frontend-development
```

Estas keywords ayudan a que el paquete aparezca para usuarios que no conocen el nombre `yRest`, pero sí conocen el problema.

### 4.4. Configuración del binario CLI

Aunque el paquete sea scoped, el comando puede seguir llamándose `yrest`.

```json
{
  "bin": {
    "yrest": "./dist/cli.js"
  }
}
```

Eso permite que, tras instalarlo globalmente:

```bash
npm install -g @aggiovato/yrest
```

el usuario pueda ejecutar:

```bash
yrest serve db.yml
```

Y también permite documentar:

```bash
npx --package @aggiovato/yrest yrest serve db.yml
```

O, si funciona correctamente por resolución de npx:

```bash
npx @aggiovato/yrest serve db.yml
```

### 4.5. Campo `repository`

Asegurar que el paquete apunta al repo correcto:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/aggiovato/yaml-rest.git"
  }
}
```

### 4.6. Campo `homepage`

Si se crea una landing específica, usarla:

```json
{
  "homepage": "https://aggiovato.com/yrest"
}
```

Si no existe todavía, apuntar al README del repo:

```json
{
  "homepage": "https://github.com/aggiovato/yaml-rest#readme"
}
```

### 4.7. Campo `bugs`

```json
{
  "bugs": {
    "url": "https://github.com/aggiovato/yaml-rest/issues"
  }
}
```

---

## 5. Estrategia para el bloqueo del nombre `yrest` en npm

### 5.1. Problema

Aunque `yrest` pueda parecer disponible, npm puede bloquear la publicación de nombres unscoped si considera que son demasiado parecidos a paquetes existentes, por ejemplo `jest`.

Esto probablemente responde a mecanismos anti-typosquatting y anti-confusión.

No conviene intentar “saltarse” el bloqueo de forma agresiva o engañosa. Es mejor resolverlo por vías limpias.

### 5.2. Opción recomendada: mantener `@aggiovato/yrest` y exponer CLI `yrest`

Esta es la solución más práctica:

```json
{
  "name": "@aggiovato/yrest",
  "bin": {
    "yrest": "./dist/cli.js"
  }
}
```

Ventajas:

- Evita el bloqueo de npm.
- Mantiene la marca `yRest`.
- Permite usar el comando `yrest` tras instalación.
- No obliga a cambiar la identidad del proyecto.
- Es una solución estándar en paquetes scoped.

Uso documentado:

```bash
npm install -D @aggiovato/yrest
npx @aggiovato/yrest serve db.yml
```

O global:

```bash
npm install -g @aggiovato/yrest
yrest serve db.yml
```

### 5.3. Opción de marca más limpia: crear organización npm

Otra alternativa sería crear un scope de producto:

```text
@yrest/cli
@yrest/core
@yrest/server
```

Ejemplo:

```json
{
  "name": "@yrest/cli",
  "bin": {
    "yrest": "./dist/cli.js"
  }
}
```

Uso:

```bash
npx @yrest/cli serve db.yml
```

Ventajas:

- Marca más profesional.
- Escalable si luego se separa core, CLI, plugins, presets, etc.
- Menos dependiente del nombre personal `@aggiovato`.

Desventajas:

- Requiere gestionar una organización/scope adicional.
- Puede dividir downloads entre paquetes si no se planifica bien.
- Para un proyecto joven quizá añade complejidad innecesaria.

### 5.4. Opción: pedir revisión a npm

Se puede abrir un ticket explicando que `yrest` significa “YAML REST” y no tiene relación con `jest`.

Texto sugerido:

```text
Hello npm support,

I tried to publish the unscoped package name `yrest`, but it was blocked as too similar to existing packages such as `jest`.

I believe this is a false positive. `yrest` is intended as a short name for “YAML REST”, and the package is a YAML-powered REST API mock server for frontend development. It is not a test runner, does not mimic Jest, and is not related to the Jest ecosystem.

The package is already published as `@aggiovato/yrest`:
https://www.npmjs.com/package/@aggiovato/yrest

The package description, README and keywords clearly position it as a YAML REST mock server / json-server alternative.

Could you review whether the unscoped name `yrest` can be allowed?

Thank you.
```

### 5.5. Opción: nombres unscoped alternativos

Si se quisiera publicar un paquete unscoped alternativo, algunos nombres posibles:

```text
yamlrest
yaml-rest-api
yaml-rest-server
yaml-mock-api
yaml-mock-server
yaml-fake-api
db-yaml-server
rest-yaml-server
yml-rest-server
```

Pero el riesgo es que npm también bloquee algunos si los considera demasiado similares a otros paquetes o demasiado genéricos.

Además, cambiar la marca puede diluir el nombre `yRest`.

### 5.6. Recomendación final sobre naming

La mejor estrategia es:

1. Mantener paquete: **`@aggiovato/yrest`**.
2. Mantener marca: **yRest**.
3. Mantener comando CLI: **`yrest`**.
4. Documentar claramente:

```bash
npx @aggiovato/yrest serve db.yml
```

Y tras instalación:

```bash
yrest serve db.yml
```

---

## 6. Mejoras en el README

El README debe estar optimizado para tres públicos:

1. Usuarios humanos que aterrizan desde npm/GitHub.
2. Buscadores.
3. Herramientas de recomendación/asistentes que leen contenido público.

### 6.1. Top del README recomendado

El inicio debería explicar el producto sin rodeos:

```md
# yRest

YAML-powered REST API mock server for frontend development.

Create a full CRUD fake backend from a simple `db.yml` file — no database, no backend code, no setup.

> Think `json-server`, but powered by YAML, with relations, filters, pagination, nested routes, snapshots and custom handlers.
```

Este bloque debe aparecer antes de explicaciones largas.

### 6.2. Añadir badges

En la parte superior:

```md
[![npm version](https://img.shields.io/npm/v/@aggiovato/yrest.svg)](https://www.npmjs.com/package/@aggiovato/yrest)
[![npm downloads](https://img.shields.io/npm/dm/@aggiovato/yrest.svg)](https://www.npmjs.com/package/@aggiovato/yrest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
```

Si hay CI:

```md
[![CI](https://github.com/aggiovato/yaml-rest/actions/workflows/ci.yml/badge.svg)](https://github.com/aggiovato/yaml-rest/actions)
```

### 6.3. Quick start muy corto

Debe haber una sección visible de instalación y uso:

````md
## Quick start

```bash
npm install -D @aggiovato/yrest
npx @aggiovato/yrest init --sample relational
npx @aggiovato/yrest serve db.yml --watch
```
````

Your mock API is now running:

```bash
curl http://localhost:3070/users
curl "http://localhost:3070/posts?_expand=user"
```

````

### 6.4. Ejemplo mínimo de `db.yml`

Incluir un ejemplo pequeño, pero suficiente para ver relaciones:

```yaml
_rel:
  posts:
    userId: users
  comments:
    postId: posts

users:
  - id: 1
    name: Ana
    email: ana@test.com

posts:
  - id: 1
    title: First post
    userId: 1

comments:
  - id: 1
    body: Nice post
    postId: 1
````

### 6.5. Ejemplos de endpoints generados

Mostrar el valor inmediatamente:

```bash
curl http://localhost:3070/users
curl http://localhost:3070/users/1
curl "http://localhost:3070/posts?userId=1"
curl "http://localhost:3070/posts?_expand=user"
curl "http://localhost:3070/users/1?_embed=posts"
curl "http://localhost:3070/posts?_sort=createdAt&_order=desc"
curl "http://localhost:3070/users?_q=ana"
```

Esto comunica capacidades y mejora posicionamiento por términos buscables.

### 6.6. Sección “Why yRest?”

```md
## Why yRest?

Use yRest when you need:

- A fake REST API from a YAML file
- A `json-server` alternative with native YAML support
- CRUD endpoints generated from `db.yml`
- Relations with `_rel`, `_expand`, `_embed`
- Filters, sorting, pagination and field projection
- A mock backend for React, Angular, Vue, Svelte or Astro apps
- A lightweight backend for frontend demos, tests and prototypes
```

### 6.7. Sección “Features”

```md
## Features

- Zero-config mock REST API
- YAML-first data source
- Full CRUD endpoints
- Query filters and operators
- Global search with `_q`
- Sorting and pagination
- Field projection with `_fields`
- Relations with `_rel`
- Resource expansion with `_expand`
- Resource embedding with `_embed`
- Nested routes
- Watch mode
- Read-only mode
- Artificial delay simulation
- Snapshots
- Custom routes
- JavaScript handlers for advanced logic
- Built with TypeScript and Fastify
```

### 6.8. Tabla comparativa contra alternativas

Una tabla comparativa ayuda a usuarios y posicionamiento.

```md
## yRest vs alternatives

| Tool        | Data source                 |      CRUD |      Relations | Best for                  |
| ----------- | --------------------------- | --------: | -------------: | ------------------------- |
| yRest       | YAML / `db.yml`             |       Yes |            Yes | YAML-first fake REST APIs |
| json-server | JSON / JSON5                |       Yes |        Partial | Quick JSON mock APIs      |
| yaml-server | YAML                        |     Basic |        Limited | Simple YAML resources     |
| Mockoon     | UI / OpenAPI / data buckets |       Yes |        Partial | Visual API mocking        |
| Prism       | OpenAPI                     | Mock only | Contract-based | OpenAPI-first workflows   |
```

El objetivo no es atacar a otras herramientas, sino dejar claro cuándo elegir yRest.

### 6.9. Títulos buscables

Añadir secciones con títulos que coincidan con búsquedas reales:

```md
## Mock REST API from YAML

## json-server alternative with YAML

## Fake backend for React

## Fake backend for Angular

## CRUD API from db.yml

## YAML mock server with relations

## Mock API with nested routes

## Use yRest with Playwright tests
```

Aunque parezca repetitivo, ayuda a que el README sea encontrado por las frases que usaría un desarrollador.

---

## 7. Mejoras en GitHub

### 7.1. Descripción del repositorio

En GitHub, la descripción del repo debería ser muy clara:

```text
yRest — YAML-powered json-server alternative. Zero-config REST API mock server with CRUD, relations, filters and snapshots from db.yml.
```

### 7.2. Topics de GitHub

Añadir topics al repositorio:

```text
yaml
rest-api
mock-server
mock-api
fake-api
fake-backend
json-server
json-server-alternative
frontend
testing
typescript
fastify
cli
crud
api-mocking
```

### 7.3. Nombre del repo

Actualmente puede haber una diferencia entre:

```text
Repo:    yaml-rest
Package: @aggiovato/yrest
CLI:     yrest
```

No es necesariamente malo, pero conviene aclararlo siempre:

```md
# yRest (`@aggiovato/yrest`)

Repository: `yaml-rest`  
CLI command: `yrest`  
npm package: `@aggiovato/yrest`
```

### 7.4. Issues templates

Crear plantillas para:

- Bug report
- Feature request
- Question
- Documentation improvement

Esto transmite mantenimiento y profesionalidad.

### 7.5. Pull request template

Añadir una plantilla simple:

```md
## Summary

## Changes

## Checklist

- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes unless documented
```

### 7.6. Changelog

Tener `CHANGELOG.md` con formato claro:

```md
# Changelog

## 0.5.2

### Added

### Fixed

### Changed
```

Los releases frecuentes y bien documentados son una señal de mantenimiento.

### 7.7. Roadmap

Añadir un pequeño roadmap:

```md
## Roadmap

- OpenAPI export
- More sample databases
- Better custom route handlers
- Plugin system
- Docker image
- VS Code snippets
- Web UI explorer
```

Esto ayuda a que el proyecto parezca vivo y con dirección.

---

## 8. Página de landing recomendada

Crear una página propia en:

```text
https://aggiovato.com/yrest
```

O similar.

### 8.1. Estructura recomendada

La landing debería tener:

1. Hero claro:

```text
yRest
YAML-powered json-server alternative.
Create a mock REST API from db.yml in seconds.
```

2. Quick start:

```bash
npm install -D @aggiovato/yrest
npx @aggiovato/yrest serve db.yml --watch
```

3. Demo visual:

```text
db.yml → yrest serve → REST endpoints
```

4. Comparación con alternativas.
5. Casos de uso.
6. Ejemplos para React, Angular, Vue, Astro, Playwright.
7. Enlaces a npm y GitHub.

### 8.2. Frases SEO para la landing

Incluir frases naturales como:

```text
mock REST API from YAML
YAML fake backend
json-server alternative with YAML
CRUD API from db.yml
frontend mock server
API mocking for React and Angular
```

---

## 9. Ejemplos y repositorios demo

Crear repos de ejemplo aumenta la confianza y mejora el descubrimiento.

### 9.1. Repos sugeridos

```text
yrest-react-example
yrest-angular-example
yrest-vite-example
yrest-astro-example
yrest-playwright-example
```

### 9.2. Ejemplo React/Vite

Mostrar cómo consumir:

```ts
const users = await fetch("http://localhost:3070/users").then((res) => res.json());
```

### 9.3. Ejemplo Angular

Mostrar un servicio simple:

```ts
@Injectable({ providedIn: "root" })
export class UsersService {
  private readonly apiUrl = "http://localhost:3070/users";

  constructor(private readonly http: HttpClient) {}

  getUsers() {
    return this.http.get<User[]>(this.apiUrl);
  }
}
```

### 9.4. Ejemplo Playwright

Posicionarlo como backend mock para e2e:

```md
## Use yRest in Playwright tests

Run a local YAML-powered fake backend before your e2e tests.
```

Script posible:

```json
{
  "scripts": {
    "mock": "yrest serve db.yml --readonly",
    "test:e2e": "start-server-and-test mock http://localhost:3070 playwright test"
  }
}
```

---

## 10. Distribución y promoción externa

Para que el paquete sea reconocido, necesita menciones fuera de npm y GitHub.

### 10.1. Artículos recomendados

Publicar artículos con títulos muy buscables:

```text
I built a YAML-powered json-server alternative
```

```text
Mock REST APIs from YAML with yRest
```

```text
Create a fake backend from db.yml for frontend development
```

```text
yRest: a zero-config YAML REST API mock server
```

### 10.2. Plataformas

Publicar en:

- Dev.to
- Medium
- Hashnode
- Blog propio
- LinkedIn
- Reddit: comunidades webdev/javascript/typescript, respetando normas
- Hacker News, si hay una demo clara

### 10.3. Listas awesome

Buscar y abrir PRs en repos como:

```text
awesome-mock-server
awesome-api-mocking
awesome-rest
awesome-testing
awesome-json-server
awesome-javascript-tools
```

El objetivo es que yRest aparezca en listas donde los desarrolladores buscan herramientas.

### 10.4. Demos online

Crear demos en:

- StackBlitz
- CodeSandbox
- GitHub Codespaces

Idealmente, una demo debería permitir ver:

```text
db.yml
terminal con yrest
frontend consumiendo endpoints
```

---

## 11. Señales de confianza

Los usuarios suelen mirar señales antes de instalar un paquete nuevo.

### 11.1. Señales técnicas

Mostrar claramente:

```text
MIT licensed
Written in TypeScript
Powered by Fastify
Node.js >= 20
No database required
No config required
Works locally
Watch mode
Read-only mode
```

### 11.2. Seguridad y mantenimiento

Recomendaciones:

- Tener CI en GitHub Actions.
- Ejecutar tests en cada PR.
- Publicar con provenance si ya está configurado.
- Añadir `npm audit` o equivalente en pipeline.
- Mantener dependencias actualizadas.
- Documentar breaking changes.
- Usar releases de GitHub.
- Mantener changelog.

### 11.3. Badges sugeridos

```md
[![npm version](https://img.shields.io/npm/v/@aggiovato/yrest.svg)](https://www.npmjs.com/package/@aggiovato/yrest)
[![npm downloads](https://img.shields.io/npm/dm/@aggiovato/yrest.svg)](https://www.npmjs.com/package/@aggiovato/yrest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/aggiovato/yaml-rest/actions/workflows/ci.yml/badge.svg)](https://github.com/aggiovato/yaml-rest/actions)
```

---

## 12. Mejoras funcionales que también ayudan al posicionamiento

Aunque el objetivo principal es descubrimiento, ciertas features ayudan porque generan más casos de uso.

### 12.1. Samples oficiales

Comandos sugeridos:

```bash
yrest init --sample basic
yrest init --sample relational
yrest init --sample ecommerce
yrest init --sample blog
yrest init --sample academy
yrest init --sample booking
```

Los samples también sirven para mostrar capacidades.

### 12.2. Docker image

Crear imagen Docker descargable:

```bash
docker run -p 3070:3070 -v ./db.yml:/app/db.yml aggiovato/yrest serve db.yml
```

Esto facilita uso en CI, demos y entornos sin instalación local.

### 12.3. VS Code snippets

Crear snippets para:

- `_rel`
- colección básica
- relación uno a muchos
- custom route
- sample CRUD

### 12.4. Web UI explorer

Una página interna como:

```text
/_about
/_routes
/_explorer
```

podría ayudar a descubrir endpoints generados.

### 12.5. OpenAPI export

Feature futura muy atractiva:

```bash
yrest openapi db.yml --output openapi.yml
```

Esto permitiría integrarse con Prism, Swagger UI, documentación o tests de contrato.

---

## 13. Documentación de casos de uso

Crear documentación por intención del usuario.

### 13.1. Frontend development

```md
## Mock backend for frontend development

Use yRest while building React, Angular, Vue, Svelte or Astro apps without waiting for a real backend.
```

### 13.2. Prototyping

```md
## API prototyping from YAML

Define your data model in `db.yml` and instantly expose REST endpoints.
```

### 13.3. Testing

```md
## Fake API for tests

Run yRest in read-only mode to provide stable fixtures for integration or e2e tests.
```

### 13.4. Demos

```md
## Demo backend

Use yRest to ship frontend demos with realistic data and relations.
```

---

## 14. Estructura de documentación sugerida

Una estructura clara del repo podría ser:

```text
README.md
CHANGELOG.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
docs/
  getting-started.md
  cli.md
  db-yml.md
  crud.md
  filters.md
  relations.md
  custom-routes.md
  snapshots.md
  readonly-mode.md
  delay.md
  examples.md
examples/
  basic/
  relational/
  ecommerce/
  blog/
  academy/
  angular/
  react/
  playwright/
```

Esto permite enlazar documentación desde npm y GitHub de forma ordenada.

---

## 15. Checklist de optimización para npm

### Metadata

- [ ] Description contiene “YAML-powered json-server alternative”.
- [ ] Keywords incluyen `json-server`, `yaml`, `mock-api`, `fake-backend`, `crud`.
- [ ] `repository` apunta correctamente a GitHub.
- [ ] `homepage` apunta a landing o README.
- [ ] `bugs` apunta a issues.
- [ ] `license` visible.
- [ ] `engines.node` definido.
- [ ] `bin.yrest` configurado.

### README en npm

- [ ] Primera línea explica qué es.
- [ ] Quick start visible.
- [ ] Ejemplo de `db.yml` visible.
- [ ] Endpoints generados visibles.
- [ ] Comparativa con alternativas.
- [ ] Casos de uso claros.
- [ ] Badges visibles.

### Descubrimiento

- [ ] Artículo publicado en Dev.to o blog.
- [ ] Landing propia publicada.
- [ ] Demo online disponible.
- [ ] Repos de ejemplo creados.
- [ ] GitHub topics configurados.
- [ ] PRs a listas awesome.

---

## 16. Checklist de optimización para GitHub

- [ ] Repo description optimizada.
- [ ] Topics añadidos.
- [ ] README reestructurado.
- [ ] Badges añadidos.
- [ ] Changelog añadido.
- [ ] Releases publicados.
- [ ] Issues templates añadidas.
- [ ] PR template añadida.
- [ ] Roadmap añadido.
- [ ] Examples folder añadido.
- [ ] Docs folder añadido.
- [ ] GitHub Pages o landing enlazada.

---

## 17. Plan de acción priorizado

### Fase 1 — Impacto inmediato

1. Cambiar `description` en `package.json`.
2. Ampliar `keywords`.
3. Asegurar `bin.yrest`.
4. Reescribir el top del README.
5. Añadir quick start.
6. Añadir ejemplo de `db.yml` y endpoints.
7. Añadir tabla comparativa.
8. Añadir GitHub topics.

### Fase 2 — Confianza y documentación

1. Añadir badges.
2. Añadir changelog.
3. Añadir roadmap.
4. Añadir issue templates.
5. Añadir ejemplos oficiales.
6. Añadir documentación por features.

### Fase 3 — Distribución externa

1. Crear landing en `aggiovato.com/yrest`.
2. Publicar artículo “I built a YAML-powered json-server alternative”.
3. Crear demo StackBlitz/CodeSandbox.
4. Crear repos de ejemplo React/Angular/Playwright.
5. Añadir yRest a listas awesome.
6. Compartir en comunidades técnicas.

### Fase 4 — Expansión del producto

1. Docker image.
2. OpenAPI export.
3. Web explorer.
4. VS Code snippets.
5. Más samples oficiales.
6. Plugins o custom handlers más documentados.

---

## 18. Propuesta de README inicial completo

Este sería un ejemplo de cómo podría empezar el README:

````md
# yRest

YAML-powered REST API mock server for frontend development.

Create a full CRUD fake backend from a simple `db.yml` file — no database, no backend code, no setup.

> Think `json-server`, but powered by YAML, with relations, filters, pagination, nested routes, snapshots and custom handlers.

## Quick start

```bash
npm install -D @aggiovato/yrest
npx @aggiovato/yrest init --sample relational
npx @aggiovato/yrest serve db.yml --watch
```
````

Your mock API is now running at:

```text
http://localhost:3070
```

## Example `db.yml`

```yaml
_rel:
  posts:
    userId: users
  comments:
    postId: posts

users:
  - id: 1
    name: Ana
    email: ana@test.com

posts:
  - id: 1
    title: First post
    userId: 1

comments:
  - id: 1
    body: Nice post
    postId: 1
```

## Generated endpoints

```bash
curl http://localhost:3070/users
curl http://localhost:3070/users/1
curl "http://localhost:3070/posts?userId=1"
curl "http://localhost:3070/posts?_expand=user"
curl "http://localhost:3070/users/1?_embed=posts"
```

## Why yRest?

Use yRest when you need:

- A fake REST API from a YAML file
- A `json-server` alternative with native YAML support
- CRUD endpoints generated from `db.yml`
- Relations with `_rel`, `_expand`, `_embed`
- Filters, sorting, pagination and field projection
- A mock backend for React, Angular, Vue, Svelte or Astro apps

````

---

## 19. Mensaje recomendado para promoción

Texto breve para compartir en redes o comunidades:

```text
I built yRest, a YAML-powered json-server alternative.

It creates a full CRUD mock REST API from a simple db.yml file, with filters, pagination, relations, nested routes, snapshots and custom handlers.

Useful for frontend development, testing and prototyping when you need a fake backend without writing backend code.

npm: @aggiovato/yrest
````

---

## 20. Conclusión

El paquete tiene buen encaje porque resuelve un problema claro: crear una API REST mock desde YAML con cero configuración. La mejora principal no está necesariamente en la funcionalidad, sino en la forma de presentarlo y hacerlo encontrable.

La estrategia más fuerte es mantener:

```text
Package: @aggiovato/yrest
Brand:   yRest
CLI:     yrest
Repo:    yaml-rest
```

Y repetir consistentemente el posicionamiento:

```text
YAML-powered json-server alternative.
```

Con una metadata optimizada, README orientado a búsquedas reales, examples, landing, demos y señales de mantenimiento, aumentará mucho la probabilidad de que yRest aparezca antes en npm, GitHub, buscadores y recomendaciones técnicas.
