---
title: Konfiguration
description: Alle yRest-Optionen — Konfigurationsdatei, CLI-Flags und Prioritätsregeln
---

yRest-Optionen können an drei Stellen gesetzt werden: Schema-Standardwerte, eine `yrest.config.yml`-Datei und CLI-Flags. Die Auflösungsreihenfolge lautet **Schema-Standardwerte → Konfigurationsdatei → CLI-Flags** — jede Quelle überschreibt die zu ihrer Linken.

## Die Konfigurationsdatei

`yrest.config.yml` befindet sich im selben Verzeichnis wie deine `db.yml`. Der Befehl `init` erstellt beide Dateien auf einmal:

```bash
npx @yrest/cli init
```

Eine vollständige Konfigurationsdatei mit allen Optionen sieht so aus:

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

Du musst nur die Optionen angeben, die du überschreiben möchtest — jeder ausgelassene Schlüssel fällt auf den Schema-Standardwert zurück.

## Prioritätsregeln

| Quelle               | Priorität  | Wann angewendet                                    |
| -------------------- | ---------- | -------------------------------------------------- |
| Schema-Standardwerte | Niedrigste | Immer — der eingebaute Fallback                    |
| `yrest.config.yml`   | Mittel     | Wenn die Datei im Arbeitsverzeichnis vorhanden ist |
| CLI-Flags            | Höchste    | Wenn explizit an `yrest serve` übergeben           |

Ein auf der Kommandozeile übergebener Flag gewinnt immer gegenüber der Konfigurationsdatei. Die Konfigurationsdatei gewinnt immer gegenüber den eingebauten Standardwerten.

## Optionsreferenz

### port

|          |                  |
| -------- | ---------------- |
| Typ      | `number`         |
| Standard | `3070`           |
| CLI-Flag | `-p, --port <n>` |

Der TCP-Port, auf dem der Server lauscht. Port `3070` wurde gewählt, um Konflikte mit den häufigsten Entwicklungsports (3000, 3001, 4000, 8080, 8000) zu vermeiden, sodass du yRest neben deinem Frontend-Dev-Server betreiben kannst, ohne etwas konfigurieren zu müssen.

```yaml
port: 4000
```

```bash
npx @yrest/cli serve db.yml --port 4000
```

---

### host

|          |                     |
| -------- | ------------------- |
| Typ      | `string`            |
| Standard | `"localhost"`       |
| CLI-Flag | `-H, --host <host>` |

Der Hostname oder die IP-Adresse, an die der Server gebunden wird. Der Standard `localhost` macht den Server nur von derselben Maschine aus erreichbar. Setze ihn auf `0.0.0.0`, um den Server auf allen Netzwerkschnittstellen zu exponieren — nützlich in Docker-Containern oder wenn andere Geräte im LAN darauf zugreifen müssen.

```yaml
host: 0.0.0.0 # auf allen Schnittstellen exponieren
```

---

### base

|          |                     |
| -------- | ------------------- |
| Typ      | `string`            |
| Standard | `""` (keiner)       |
| CLI-Flag | `-b, --base <path>` |

Ein URL-Präfix, das jeder Route vorangestellt wird — sowohl CRUD-Collection-Routen als auch benutzerdefinierten `_routes`-Einträgen. Ein führender Schrägstrich wird automatisch hinzugefügt, falls er fehlt.

Mit `base: /api/v1` wird die Collection `users` unter `/api/v1/users` statt `/users` exponiert. Die Meta-Endpunkte `/_about` und `/_snapshot` werden nicht präfixiert.

```yaml
base: /api/v1
```

```bash
# GET http://localhost:3070/api/v1/users
npx @yrest/cli serve db.yml --base /api/v1
```

---

### watch

|          |               |
| -------- | ------------- |
| Typ      | `boolean`     |
| Standard | `false`       |
| CLI-Flag | `-w, --watch` |

Wenn aktiviert, überwacht yRest `db.yml` auf Dateiänderungen und lädt automatisch neu, ohne den Prozess zu beenden. Jede Collection, Relation oder benutzerdefinierte Route, die du zur Datei hinzufügst, erscheint sofort im laufenden Server.

Nützlich während der aktiven Entwicklung, wenn du die Datendatei häufig bearbeitest. In CI- oder produktionsähnlichen Umgebungen lasse es auf `false`, damit die Daten während eines Testlaufs stabil bleiben.

```yaml
watch: true
```

---

### readonly

|          |                  |
| -------- | ---------------- |
| Typ      | `boolean`        |
| Standard | `false`          |
| CLI-Flag | `-r, --readonly` |

Wenn aktiviert, werden alle mutierenden Anfragen — POST, PUT, PATCH und DELETE — mit `405 Method Not Allowed` abgelehnt. GET-Anfragen und Meta-Endpunkte (`/_about`, `/_snapshot`) funktionieren weiterhin normal.

Verwende dies, wenn du einen stabilen Mock teilen möchtest, der nicht versehentlich geändert werden kann — zum Beispiel eine gemeinsame Staging-Umgebung, eine Demo oder ein schreibgeschütztes API-Fixture in einer Testsuite, bei der keine Schreibvorgänge erwartet werden.

```yaml
readonly: true
```

---

### delay

|          |                          |
| -------- | ------------------------ |
| Typ      | `number` (Millisekunden) |
| Standard | `0` (deaktiviert)        |
| CLI-Flag | `-d, --delay <ms>`       |

Fügt jeder Antwort eine feste Latenz hinzu, bevor sie gesendet wird. Dies simuliert ein langsames Netzwerk oder ein Backend mit hoher Latenz und erleichtert das Testen von Ladezuständen, Skeleton-Screens und Timeout-Behandlung in deinem Frontend.

Die Verzögerung gilt für alle Routen — Collection-Endpunkte, benutzerdefinierte Routen und SSE-Verbindungen. Für routen-spezifische Latenz bei einzelnen `_routes`-Einträgen verwende stattdessen den `delay:`-Schlüssel innerhalb der Routendefinition.

```yaml
delay: 300 # 300 ms Round-Trip simulieren
```

---

### snapshot

|          |                  |
| -------- | ---------------- |
| Typ      | `boolean`        |
| Standard | `false`          |
| CLI-Flag | `-s, --snapshot` |

Wenn aktiviert, speichert yRest beim Start den Anfangszustand der Datenbank und stellt drei Meta-Endpunkte bereit:

| Endpunkt           | Methode | Beschreibung                                                         |
| ------------------ | ------- | -------------------------------------------------------------------- |
| `/_snapshot`       | `GET`   | Gibt Snapshot-Metadaten zurück (Zeitstempel der letzten Speicherung) |
| `/_snapshot/save`  | `POST`  | Ersetzt den gespeicherten Snapshot durch den aktuellen Live-Zustand  |
| `/_snapshot/reset` | `POST`  | Stellt die Datenbank auf den zuletzt gespeicherten Snapshot zurück   |

Am nützlichsten in Integrations-Testsuites: Rufe `POST /_snapshot/reset` in einem `beforeEach`-Hook auf, um vor jedem Test einen sauberen, deterministischen Zustand sicherzustellen. Änderungen aus einem Test gelangen nie in den nächsten.

```yaml
snapshot: true
```

```bash
# Datenbank zwischen Testläufen auf den Anfangszustand zurücksetzen
curl -X POST http://localhost:3070/_snapshot/reset
```

---

### pageable

|          |                         |
| -------- | ----------------------- |
| Typ      | `boolean` oder `number` |
| Standard | `false`                 |
| CLI-Flag | `--pageable [limit]`    |

Wenn aktiviert, werden GET-Collection-Antworten in einen `{ data, pagination }`-Envelope eingeschlossen statt ein einfaches Array zurückzugeben:

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

Akzeptiert drei Formen:

| Wert     | Verhalten                                              |
| -------- | ------------------------------------------------------ |
| `false`  | Deaktiviert — einfache Array-Antworten (Standard)      |
| `true`   | Aktiviert mit Standard-Seitengröße von 10              |
| `number` | Aktiviert mit benutzerdefinierter Standard-Seitengröße |

```yaml
pageable: true   # aktiviert, standardmäßig 10 Einträge pro Seite
pageable: 20     # aktiviert, standardmäßig 20 Einträge pro Seite
```

Die pro-Anfrage gesendeten Parameter `?_page` und `?_limit` überschreiben immer den konfigurierten Standard. Wenn ein Client `?_page=2&_limit=5` sendet, verwendet der Server diese Werte unabhängig von der `pageable`-Einstellung.

---

### idStrategy

|          |                            |
| -------- | -------------------------- |
| Typ      | `"increment"` \| `"uuid"`  |
| Standard | `"increment"`              |
| CLI-Flag | `--id-strategy <strategy>` |

Die Strategie zur Generierung von `id`-Werten, wenn ein neues Element via POST ohne explizite `id` im Request-Body erstellt wird.

| Strategie   | Verhalten                                                              |
| ----------- | ---------------------------------------------------------------------- |
| `increment` | Nächste ganze Zahl über der aktuellen maximalen `id` in der Collection |
| `uuid`      | Ein zufälliger UUID-v4-String aus `crypto.randomUUID()`                |

Verwende `uuid`, wenn dein Frontend String-IDs erwartet, wenn du IDs brauchst, die über Neustarts hinweg stabil sind, oder wenn Elemente aus mehreren Collections global eindeutige Identifikatoren benötigen.

```yaml
idStrategy: uuid
```

---

### handlers

|          |                         |
| -------- | ----------------------- |
| Typ      | `string` (Dateipfad)    |
| Standard | _(automatisch erkannt)_ |
| CLI-Flag | `--handlers <file>`     |

Pfad zu einer JavaScript-Datei, die Handler-Funktionen für benutzerdefinierte Routen exportiert. yRest lädt die Datei beim Start und ruft die exportierte Funktion auf, deren Name mit dem `handler:`-Schlüssel in einem `_routes`-Eintrag übereinstimmt.

```yaml
handlers: ./yrest.handlers.js
```

Wenn diese Option weggelassen wird, erkennt yRest `yrest.handlers.js` (oder `.mjs`) im aktuellen Arbeitsverzeichnis automatisch. Verwende den expliziten Pfad, wenn deine Handler-Datei einen anderen Namen hat oder in einem Unterverzeichnis liegt.

---

## Vollständiges Beispiel

Eine Konfigurationsdatei für eine CI-Umgebung, die realistische Latenz simuliert und zwischen Testläufen sauber zurückgesetzt wird:

```yaml
# yrest.config.yml
port: 3070
host: 0.0.0.0 # auf allen Schnittstellen exponieren (Docker / CI-Runner)
base: /api/v1
watch: false # stabile Daten während des Testlaufs
readonly: false # Tests müssen schreiben
delay: 120 # realistische Netzwerklatenz simulieren
snapshot: true # POST /_snapshot/reset zwischen Testsuites aktivieren
pageable: 20 # Standard-Seitengröße für Listenendpunkte
idStrategy: uuid # Frontend erwartet String-IDs
handlers: ./tests/handlers.js
```

## Nächste Schritte

- [Server-Modi](/reference/server-modes/) — tiefere Erläuterung von watch, readonly, delay, snapshot und pageable
- [CLI-Referenz](/reference/cli-reference/) — vollständige Flag-Syntax für jeden Befehl
- [Handler-Funktionen](/routes/handlers/) — der `handler:`-Schlüssel und das Format der Handlers-Datei
