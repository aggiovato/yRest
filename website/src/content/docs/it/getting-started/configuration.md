---
title: Configurazione
description: Tutte le opzioni di yRest — file di configurazione, flag CLI e regole di priorità
---

Le opzioni di yRest possono essere impostate in tre posti: i valori predefiniti dello schema, un file `yrest.config.yml` e i flag CLI. L'ordine di risoluzione è **valori predefiniti → file di configurazione → flag CLI** — ogni sorgente sovrascrive quella alla sua sinistra.

## Il file di configurazione

`yrest.config.yml` si trova nella stessa directory del tuo `db.yml`. Il comando `init` crea entrambi i file contemporaneamente:

```bash
npx @yrest/cli init
```

Un file di configurazione completo con tutte le opzioni ha questo aspetto:

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

Devi includere solo le opzioni che vuoi sovrascrivere — qualsiasi chiave omessa torna al valore predefinito dello schema.

## Regole di priorità

| Sorgente           | Priorità     | Quando si applica                               |
| ------------------ | ------------ | ----------------------------------------------- |
| Valori predefiniti | La più bassa | Sempre — il fallback integrato                  |
| `yrest.config.yml` | Media        | Quando il file esiste nella directory di lavoro |
| Flag CLI           | La più alta  | Quando passati esplicitamente a `yrest serve`   |

Un flag passato dalla riga di comando vince sempre sul file di configurazione. Il file di configurazione vince sempre sui valori predefiniti integrati.

## Riferimento delle opzioni

### port

|             |                  |
| ----------- | ---------------- |
| Tipo        | `number`         |
| Predefinito | `3070`           |
| Flag CLI    | `-p, --port <n>` |

La porta TCP su cui il server ascolta. La porta `3070` è stata scelta per evitare conflitti con le porte di sviluppo più comuni (3000, 3001, 4000, 8080, 8000), così puoi eseguire yRest insieme al tuo server di sviluppo frontend senza modificare alcuna configurazione.

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
| Predefinito | `"localhost"`       |
| Flag CLI    | `-H, --host <host>` |

Il nome host o l'indirizzo IP a cui il server si collega. Il valore predefinito `localhost` rende il server raggiungibile solo dalla stessa macchina. Impostalo su `0.0.0.0` per esporre il server su tutte le interfacce di rete — utile nei container Docker o quando altri dispositivi sulla LAN devono raggiungerlo.

```yaml
host: 0.0.0.0 # esporre su tutte le interfacce
```

---

### base

|             |                     |
| ----------- | ------------------- |
| Tipo        | `string`            |
| Predefinito | `""` (nessuno)      |
| Flag CLI    | `-b, --base <path>` |

Un prefisso URL anteposto a tutte le route — sia le route CRUD delle collection sia le voci `_routes` personalizzate. Uno slash iniziale viene aggiunto automaticamente se assente.

Con `base: /api/v1`, la collection `users` è esposta su `/api/v1/users` invece di `/users`. Gli endpoint meta `/_about` e `/_snapshot` non vengono prefissati.

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
| Predefinito | `false`       |
| Flag CLI    | `-w, --watch` |

Quando attivo, yRest monitora le modifiche al file `db.yml` e si ricarica automaticamente senza riavviare il processo. Qualsiasi collection, relazione o route personalizzata che aggiungi al file appare immediatamente nel server in esecuzione.

Utile durante lo sviluppo attivo quando modifichi frequentemente il file di dati. In ambienti CI o simili alla produzione, lascialo su `false` in modo che i dati rimangano stabili durante l'intero ciclo di test.

```yaml
watch: true
```

---

### readonly

|             |                  |
| ----------- | ---------------- |
| Tipo        | `boolean`        |
| Predefinito | `false`          |
| Flag CLI    | `-r, --readonly` |

Quando attivo, tutte le richieste mutanti — POST, PUT, PATCH e DELETE — vengono rifiutate con `405 Method Not Allowed`. Le richieste GET e gli endpoint meta (`/_about`, `/_snapshot`) continuano a funzionare normalmente.

Usalo quando vuoi condividere un mock stabile che non può essere modificato accidentalmente — per esempio, un ambiente di staging condiviso, una demo, o un fixture API in sola lettura in una suite di test dove le scritture non sono previste.

```yaml
readonly: true
```

---

### delay

|             |                         |
| ----------- | ----------------------- |
| Tipo        | `number` (millisecondi) |
| Predefinito | `0` (disabilitato)      |
| Flag CLI    | `-d, --delay <ms>`      |

Aggiunge una latenza fissa a ogni risposta prima che venga inviata. Questo simula una rete lenta o un backend ad alta latenza, rendendo più facile testare stati di caricamento, skeleton screen e gestione dei timeout nel tuo frontend.

Il ritardo si applica a tutte le route — endpoint delle collection, route personalizzate e connessioni SSE. Per una latenza specifica per singole voci di `_routes`, usa invece la chiave `delay:` all'interno della definizione della route.

```yaml
delay: 300 # simulare un round trip di 300 ms
```

---

### snapshot

|             |                  |
| ----------- | ---------------- |
| Tipo        | `boolean`        |
| Predefinito | `false`          |
| Flag CLI    | `-s, --snapshot` |

Quando attivo, yRest salva lo stato iniziale del database all'avvio ed espone tre endpoint meta:

| Endpoint           | Metodo | Descrizione                                                               |
| ------------------ | ------ | ------------------------------------------------------------------------- |
| `/_snapshot`       | `GET`  | Restituisce i metadati dello snapshot (timestamp dell'ultimo salvataggio) |
| `/_snapshot/save`  | `POST` | Sostituisce lo snapshot salvato con lo stato live attuale                 |
| `/_snapshot/reset` | `POST` | Ripristina il database all'ultimo snapshot salvato                        |

È particolarmente utile nelle suite di test di integrazione: chiama `POST /_snapshot/reset` in un hook `beforeEach` per garantire uno stato pulito e deterministico prima di ogni test. Le modifiche accumulate durante un test non si propagano mai al successivo.

```yaml
snapshot: true
```

```bash
# Ripristinare il database allo stato iniziale tra i cicli di test
curl -X POST http://localhost:3070/_snapshot/reset
```

---

### pageable

|             |                      |
| ----------- | -------------------- |
| Tipo        | `boolean` o `number` |
| Predefinito | `false`              |
| Flag CLI    | `--pageable [limit]` |

Quando attivo, le risposte GET delle collection vengono avvolte in un envelope `{ data, pagination }` invece di restituire un array semplice:

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

Accetta tre forme:

| Valore   | Comportamento                                                 |
| -------- | ------------------------------------------------------------- |
| `false`  | Disabilitato — risposte in array semplice (predefinito)       |
| `true`   | Abilitato con dimensione di pagina predefinita di 10          |
| `number` | Abilitato con dimensione di pagina predefinita personalizzata |

```yaml
pageable: true   # abilitato, 10 elementi per pagina di default
pageable: 20     # abilitato, 20 elementi per pagina di default
```

I parametri `?_page` e `?_limit` inviati in ogni richiesta hanno sempre la precedenza sul valore configurato. Se un client invia `?_page=2&_limit=5`, il server usa quei valori indipendentemente dall'impostazione di `pageable`.

---

### idStrategy

|             |                            |
| ----------- | -------------------------- |
| Tipo        | `"increment"` \| `"uuid"`  |
| Predefinito | `"increment"`              |
| Flag CLI    | `--id-strategy <strategy>` |

La strategia usata per generare i valori `id` quando un nuovo elemento viene creato via POST senza un `id` esplicito nel corpo della richiesta.

| Strategia   | Comportamento                                                       |
| ----------- | ------------------------------------------------------------------- |
| `increment` | Prossimo intero superiore all'`id` massimo attuale nella collection |
| `uuid`      | Una stringa UUID v4 casuale generata da `crypto.randomUUID()`       |

Usa `uuid` quando il tuo frontend si aspetta ID di tipo stringa, quando hai bisogno di ID stabili tra i riavvii, o quando gli elementi di più collection necessitano di identificatori globalmente unici.

```yaml
idStrategy: uuid
```

---

### handlers

|             |                          |
| ----------- | ------------------------ |
| Tipo        | `string` (percorso file) |
| Predefinito | _(auto-scoperto)_        |
| Flag CLI    | `--handlers <file>`      |

Percorso a un file JavaScript che esporta funzioni handler per le route personalizzate. yRest carica il file all'avvio e chiama la funzione esportata il cui nome corrisponde alla chiave `handler:` in una voce `_routes`.

```yaml
handlers: ./yrest.handlers.js
```

Se questa opzione viene omessa, yRest continua a scoprire automaticamente `yrest.handlers.js` (o `.mjs`) nella directory di lavoro corrente. Usa il percorso esplicito quando il tuo file di handler ha un nome diverso o si trova in una sottodirectory.

---

## Esempio completo

Un file di configurazione per un ambiente CI che simula una latenza realistica e si ripristina in modo pulito tra i cicli di test:

```yaml
# yrest.config.yml
port: 3070
host: 0.0.0.0 # esporre su tutte le interfacce (Docker / CI runner)
base: /api/v1
watch: false # dati stabili durante il ciclo di test
readonly: false # i test devono scrivere
delay: 120 # simulare una latenza di rete realistica
snapshot: true # abilitare POST /_snapshot/reset tra le suite di test
pageable: 20 # dimensione di pagina predefinita per gli endpoint di lista
idStrategy: uuid # il frontend si aspetta ID di tipo stringa
handlers: ./tests/handlers.js
```

## Prossimi passi

- [Modalità server](/reference/server-modes/) — spiegazione approfondita del comportamento di watch, readonly, delay, snapshot e pageable
- [Riferimento CLI](/reference/cli-reference/) — sintassi completa dei flag per ogni comando
- [Funzioni handler](/routes/handlers/) — la chiave `handler:` e il formato del file di handler
