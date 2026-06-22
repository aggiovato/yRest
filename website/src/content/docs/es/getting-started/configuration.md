---
title: Configuración
description: Todas las opciones de yRest — archivo de configuración, flags CLI y reglas de prioridad
---

Las opciones de yRest se pueden establecer en tres lugares: los valores por defecto del esquema, un archivo `yrest.config.yml` y los flags de CLI. El orden de resolución es **valores por defecto → archivo de configuración → flags CLI** — cada fuente sobreescribe a la que tiene a su izquierda.

## El archivo de configuración

`yrest.config.yml` reside en el mismo directorio que tu `db.yml`. El comando `init` crea ambos archivos a la vez:

```bash
npx @yrest/cli init
```

Un archivo de configuración completo con todas las opciones tiene este aspecto:

```yaml
# yrest.config.yml
port: 3070
host: localhost
base: ""
watch: false
readonly: false
delay: 0
snapshot: false
pageable: false
idStrategy: increment
# handlers: ./yrest.handlers.js
```

Solo necesitas incluir las opciones que quieras sobreescribir — cualquier clave que omitas vuelve al valor por defecto del esquema.

## Reglas de prioridad

| Fuente              | Prioridad | Cuándo aplica                                        |
| ------------------- | --------- | ---------------------------------------------------- |
| Valores por defecto | Más baja  | Siempre — el fallback integrado                      |
| `yrest.config.yml`  | Media     | Cuando el archivo existe en el directorio de trabajo |
| Flags CLI           | Más alta  | Cuando se pasan explícitamente a `yrest serve`       |

Un flag pasado por línea de comandos siempre gana sobre el archivo de configuración. El archivo de configuración siempre gana sobre los valores por defecto integrados.

## Referencia de opciones

### port

|             |                  |
| ----------- | ---------------- |
| Tipo        | `number`         |
| Por defecto | `3070`           |
| Flag CLI    | `-p, --port <n>` |

El puerto TCP en el que escucha el servidor. El puerto `3070` se eligió para evitar conflictos con los puertos de desarrollo más comunes (3000, 3001, 4000, 8080, 8000), de modo que puedes ejecutar yRest junto a tu servidor de desarrollo frontend sin cambiar ninguna configuración.

```yaml
port: 4000
```

```bash
npx @yrest/cli serve db.yml --port 4000
```

---

### host

|             |                     |
| ----------- | ------------------- |
| Tipo        | `string`            |
| Por defecto | `"localhost"`       |
| Flag CLI    | `-H, --host <host>` |

El nombre de host o dirección IP a la que se vincula el servidor. El valor por defecto `localhost` hace que el servidor solo sea accesible desde la misma máquina. Establécelo en `0.0.0.0` para exponer el servidor en todas las interfaces de red — útil dentro de contenedores Docker o cuando otros dispositivos en la LAN necesitan acceder a él.

```yaml
host: 0.0.0.0 # exponer en todas las interfaces
```

---

### base

|             |                     |
| ----------- | ------------------- |
| Tipo        | `string`            |
| Por defecto | `""` (ninguno)      |
| Flag CLI    | `-b, --base <path>` |

Un prefijo URL que se antepone a todas las rutas — tanto las rutas CRUD de colecciones como las entradas de `_routes` personalizadas. Si omites la barra inicial, se añade automáticamente.

Con `base: /api/v1`, la colección `users` queda expuesta en `/api/v1/users` en lugar de `/users`. Los endpoints meta `/_about` y `/_snapshot` no se ven afectados por el prefijo.

```yaml
base: /api/v1
```

```bash
# GET http://localhost:3070/api/v1/users
npx @yrest/cli serve db.yml --base /api/v1
```

---

### watch

|             |               |
| ----------- | ------------- |
| Tipo        | `boolean`     |
| Por defecto | `false`       |
| Flag CLI    | `-w, --watch` |

Cuando está activado, yRest observa los cambios en `db.yml` en el sistema de archivos y se recarga automáticamente sin reiniciar el proceso. Cualquier colección, relación o ruta personalizada que añadas al archivo aparece de inmediato en el servidor en ejecución.

Es útil durante el desarrollo activo cuando estás editando el archivo de datos con frecuencia. En CI o entornos similares a producción, déjalo en `false` para que los datos se mantengan estables durante todo el ciclo de pruebas.

```yaml
watch: true
```

---

### readonly

|             |                  |
| ----------- | ---------------- |
| Tipo        | `boolean`        |
| Por defecto | `false`          |
| Flag CLI    | `-r, --readonly` |

Cuando está activado, todas las peticiones mutantes — POST, PUT, PATCH y DELETE — son rechazadas con `405 Method Not Allowed`. Las peticiones GET y los endpoints meta (`/_about`, `/_snapshot`) continúan funcionando con normalidad.

Úsalo cuando quieras compartir un mock estable que no pueda modificarse accidentalmente — por ejemplo, un entorno de staging compartido, una demo, o un fixture de API de solo lectura en un conjunto de pruebas donde no se esperan escrituras.

```yaml
readonly: true
```

---

### delay

|             |                         |
| ----------- | ----------------------- |
| Tipo        | `number` (milisegundos) |
| Por defecto | `0` (desactivado)       |
| Flag CLI    | `-d, --delay <ms>`      |

Añade una latencia fija a cada respuesta antes de enviarla. Esto simula una red lenta o un backend con alta latencia, facilitando la prueba de estados de carga, skeleton screens y manejo de timeouts en tu frontend.

El delay se aplica a todas las rutas: endpoints de colecciones, rutas personalizadas y conexiones SSE. Para aplicar latencia a rutas individuales de `_routes`, usa la clave `delay:` dentro de la definición de la ruta en lugar de esta opción global.

```yaml
delay: 300 # simular un round trip de 300 ms
```

---

### snapshot

|             |                  |
| ----------- | ---------------- |
| Tipo        | `boolean`        |
| Por defecto | `false`          |
| Flag CLI    | `-s, --snapshot` |

Cuando está activado, yRest guarda el estado inicial de la base de datos al arrancar y expone tres endpoints meta:

| Endpoint           | Método | Descripción                                                         |
| ------------------ | ------ | ------------------------------------------------------------------- |
| `/_snapshot`       | `GET`  | Devuelve los metadatos del snapshot (timestamp del último guardado) |
| `/_snapshot/save`  | `POST` | Reemplaza el snapshot guardado con el estado actual en vivo         |
| `/_snapshot/reset` | `POST` | Restaura la base de datos al último snapshot guardado               |

Es especialmente útil en suites de tests de integración: llama a `POST /_snapshot/reset` en un hook `beforeEach` para garantizar un estado limpio y determinista antes de cada test. Los cambios acumulados durante un test nunca se filtran al siguiente.

```yaml
snapshot: true
```

```bash
# Resetear la base de datos a su estado inicial entre ciclos de pruebas
curl -X POST http://localhost:3070/_snapshot/reset
```

---

### pageable

|             |                      |
| ----------- | -------------------- |
| Tipo        | `boolean` o `number` |
| Por defecto | `false`              |
| Flag CLI    | `--pageable [limit]` |

Cuando está activado, las respuestas GET de colecciones se envuelven en un envelope `{ data, pagination }` en lugar de devolver un array plano:

```json
{
  "data": [
    { "id": 1, "name": "Ana" },
    { "id": 2, "name": "Luis" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

Acepta tres formas:

| Valor    | Comportamiento                                             |
| -------- | ---------------------------------------------------------- |
| `false`  | Desactivado — respuestas en array plano (por defecto)      |
| `true`   | Activado con tamaño de página por defecto de 10            |
| `number` | Activado con un tamaño de página por defecto personalizado |

```yaml
pageable: true   # activado, 10 items por página por defecto
pageable: 20     # activado, 20 items por página por defecto
```

Los parámetros de consulta `?_page` y `?_limit` enviados en cada petición siempre tienen prioridad sobre el valor configurado. Si un cliente envía `?_page=2&_limit=5`, el servidor usa esos valores independientemente del valor de `pageable`.

---

### idStrategy

|             |                            |
| ----------- | -------------------------- |
| Tipo        | `"increment"` \| `"uuid"`  |
| Por defecto | `"increment"`              |
| Flag CLI    | `--id-strategy <strategy>` |

La estrategia usada para generar valores `id` cuando se crea un nuevo item via POST sin un `id` explícito en el cuerpo de la petición.

| Estrategia  | Comportamiento                                                     |
| ----------- | ------------------------------------------------------------------ |
| `increment` | Siguiente entero por encima del `id` máximo actual en la colección |
| `uuid`      | Un string UUID v4 aleatorio generado con `crypto.randomUUID()`     |

Usa `uuid` cuando tu frontend espere IDs de tipo string, cuando necesites IDs que sean estables entre reinicios, o cuando los items de varias colecciones necesiten identificadores globalmente únicos.

```yaml
idStrategy: uuid
```

---

### handlers

|             |                            |
| ----------- | -------------------------- |
| Tipo        | `string` (ruta de archivo) |
| Por defecto | _(auto-descubierto)_       |
| Flag CLI    | `--handlers <file>`        |

Ruta a un archivo JavaScript que exporta funciones handler para rutas personalizadas. yRest carga el archivo al arrancar y llama a la función exportada cuyo nombre coincide con la clave `handler:` en una entrada de `_routes`.

```yaml
handlers: ./yrest.handlers.js
```

Si esta opción se omite, yRest sigue descubriendo automáticamente `yrest.handlers.js` (o `.mjs`) en el directorio de trabajo actual. Usa la ruta explícita cuando tu archivo de handlers tenga un nombre diferente o esté en un subdirectorio.

---

## Ejemplo completo

Un archivo de configuración para un entorno CI que simula latencia realista y resetea limpiamente entre ciclos de pruebas:

```yaml
# yrest.config.yml
port: 3070
host: 0.0.0.0 # exponer en todas las interfaces (Docker / CI runner)
base: /api/v1
watch: false # datos estables durante el ciclo de pruebas
readonly: false # los tests necesitan escribir
delay: 120 # simular latencia de red realista
snapshot: true # habilitar POST /_snapshot/reset entre suites de pruebas
pageable: 20 # tamaño de página por defecto para endpoints de lista
idStrategy: uuid # el frontend espera IDs de tipo string
handlers: ./tests/handlers.js
```

## Próximos pasos

- [Modos de servidor](/reference/server-modes/) — explicación detallada del comportamiento de watch, readonly, delay, snapshot y pageable
- [Referencia CLI](/reference/cli-reference/) — sintaxis completa de flags para cada comando
- [Funciones handler](/routes/handlers/) — la clave `handler:` y el formato del archivo de handlers
