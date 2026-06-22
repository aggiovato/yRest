---
title: Configuration
description: Toutes les options de yRest — fichier de configuration, flags CLI et règles de priorité
---

Les options de yRest peuvent être définies à trois endroits : les valeurs par défaut du schéma, un fichier `yrest.config.yml` et les flags CLI. L'ordre de résolution est **valeurs par défaut → fichier de configuration → flags CLI** — chaque source écrase celle qui se trouve à sa gauche.

## Le fichier de configuration

`yrest.config.yml` se trouve dans le même répertoire que ton `db.yml`. La commande `init` crée les deux fichiers à la fois :

```bash
npx @yrest/cli init
```

Un fichier de configuration complet avec toutes les options ressemble à ceci :

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

Tu n'as besoin d'inclure que les options que tu veux écraser — toute clé omise revient à la valeur par défaut du schéma.

## Règles de priorité

| Source             | Priorité      | Quand elle s'applique                                 |
| ------------------ | ------------- | ----------------------------------------------------- |
| Valeurs par défaut | La plus basse | Toujours — le fallback intégré                        |
| `yrest.config.yml` | Moyenne       | Quand le fichier existe dans le répertoire de travail |
| Flags CLI          | La plus haute | Quand explicitement passés à `yrest serve`            |

Un flag passé en ligne de commande gagne toujours sur le fichier de configuration. Le fichier de configuration gagne toujours sur les valeurs par défaut intégrées.

## Référence des options

### port

|            |                  |
| ---------- | ---------------- |
| Type       | `number`         |
| Par défaut | `3070`           |
| Flag CLI   | `-p, --port <n>` |

Le port TCP sur lequel le serveur écoute. Le port `3070` a été choisi pour éviter les conflits avec les ports de développement les plus courants (3000, 3001, 4000, 8080, 8000), afin que tu puisses exécuter yRest à côté de ton serveur de développement frontend sans modifier aucune configuration.

```yaml
port: 4000
```

```bash
npx @yrest/cli serve db.yml --port 4000
```

---

### host

|            |                     |
| ---------- | ------------------- |
| Type       | `string`            |
| Par défaut | `"localhost"`       |
| Flag CLI   | `-H, --host <host>` |

Le nom d'hôte ou l'adresse IP à laquelle le serveur se lie. La valeur par défaut `localhost` rend le serveur accessible uniquement depuis la même machine. Définis-le sur `0.0.0.0` pour exposer le serveur sur toutes les interfaces réseau — utile dans les conteneurs Docker ou quand d'autres appareils sur le réseau local doivent y accéder.

```yaml
host: 0.0.0.0 # exposer sur toutes les interfaces
```

---

### base

|            |                     |
| ---------- | ------------------- |
| Type       | `string`            |
| Par défaut | `""` (aucun)        |
| Flag CLI   | `-b, --base <path>` |

Un préfixe URL ajouté à toutes les routes — à la fois les routes CRUD des collections et les entrées `_routes` personnalisées. Un slash initial est ajouté automatiquement s'il est absent.

Avec `base: /api/v1`, la collection `users` est exposée sous `/api/v1/users` au lieu de `/users`. Les endpoints meta `/_about` et `/_snapshot` ne sont pas préfixés.

```yaml
base: /api/v1
```

```bash
# GET http://localhost:3070/api/v1/users
npx @yrest/cli serve db.yml --base /api/v1
```

---

### watch

|            |               |
| ---------- | ------------- |
| Type       | `boolean`     |
| Par défaut | `false`       |
| Flag CLI   | `-w, --watch` |

Quand activé, yRest surveille les modifications du fichier `db.yml` et recharge automatiquement sans redémarrer le processus. Toute collection, relation ou route personnalisée que tu ajoutes au fichier apparaît immédiatement dans le serveur en cours d'exécution.

C'est utile pendant le développement actif quand tu modifies fréquemment le fichier de données. Dans des environnements CI ou similaires à la production, laisse-le sur `false` afin que les données restent stables pendant tout le cycle de tests.

```yaml
watch: true
```

---

### readonly

|            |                  |
| ---------- | ---------------- |
| Type       | `boolean`        |
| Par défaut | `false`          |
| Flag CLI   | `-r, --readonly` |

Quand activé, toutes les requêtes mutantes — POST, PUT, PATCH et DELETE — sont rejetées avec `405 Method Not Allowed`. Les requêtes GET et les endpoints meta (`/_about`, `/_snapshot`) continuent de fonctionner normalement.

Utilise ceci quand tu veux partager un mock stable qui ne peut pas être modifié accidentellement — par exemple, un environnement de staging partagé, une démo, ou un fixture d'API en lecture seule dans une suite de tests où les écritures ne sont pas attendues.

```yaml
readonly: true
```

---

### delay

|            |                          |
| ---------- | ------------------------ |
| Type       | `number` (millisecondes) |
| Par défaut | `0` (désactivé)          |
| Flag CLI   | `-d, --delay <ms>`       |

Ajoute une latence fixe à chaque réponse avant qu'elle soit envoyée. Cela simule un réseau lent ou un backend à haute latence, facilitant le test des états de chargement, des skeleton screens et de la gestion des timeouts dans ton frontend.

Le délai s'applique à toutes les routes — endpoints de collections, routes personnalisées et connexions SSE. Pour une latence spécifique à des routes individuelles dans `_routes`, utilise plutôt la clé `delay:` à l'intérieur de la définition de la route.

```yaml
delay: 300 # simuler un aller-retour de 300 ms
```

---

### snapshot

|            |                  |
| ---------- | ---------------- |
| Type       | `boolean`        |
| Par défaut | `false`          |
| Flag CLI   | `-s, --snapshot` |

Quand activé, yRest sauvegarde l'état initial de la base de données au démarrage et expose trois endpoints meta :

| Endpoint           | Méthode | Description                                                                 |
| ------------------ | ------- | --------------------------------------------------------------------------- |
| `/_snapshot`       | `GET`   | Retourne les métadonnées du snapshot (horodatage de la dernière sauvegarde) |
| `/_snapshot/save`  | `POST`  | Remplace le snapshot sauvegardé par l'état live actuel                      |
| `/_snapshot/reset` | `POST`  | Restaure la base de données au dernier snapshot sauvegardé                  |

C'est particulièrement utile dans les suites de tests d'intégration : appelle `POST /_snapshot/reset` dans un hook `beforeEach` pour garantir un état propre et déterministe avant chaque test. Les modifications accumulées pendant un test ne se propagent jamais au suivant.

```yaml
snapshot: true
```

```bash
# Réinitialiser la base de données à son état initial entre les cycles de tests
curl -X POST http://localhost:3070/_snapshot/reset
```

---

### pageable

|            |                       |
| ---------- | --------------------- |
| Type       | `boolean` ou `number` |
| Par défaut | `false`               |
| Flag CLI   | `--pageable [limit]`  |

Quand activé, les réponses GET des collections sont enveloppées dans un envelope `{ data, pagination }` au lieu de retourner un tableau simple :

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

Accepte trois formes :

| Valeur   | Comportement                                            |
| -------- | ------------------------------------------------------- |
| `false`  | Désactivé — réponses en tableau simple (par défaut)     |
| `true`   | Activé avec une taille de page par défaut de 10         |
| `number` | Activé avec une taille de page par défaut personnalisée |

```yaml
pageable: true   # activé, 10 éléments par page par défaut
pageable: 20     # activé, 20 éléments par page par défaut
```

Les paramètres `?_page` et `?_limit` envoyés dans chaque requête ont toujours la priorité sur la valeur configurée. Si un client envoie `?_page=2&_limit=5`, le serveur utilise ces valeurs quelle que soit la valeur de `pageable`.

---

### idStrategy

|            |                            |
| ---------- | -------------------------- |
| Type       | `"increment"` \| `"uuid"`  |
| Par défaut | `"increment"`              |
| Flag CLI   | `--id-strategy <strategy>` |

La stratégie utilisée pour générer les valeurs `id` quand un nouvel élément est créé via POST sans `id` explicite dans le corps de la requête.

| Stratégie   | Comportement                                                          |
| ----------- | --------------------------------------------------------------------- |
| `increment` | Prochain entier au-dessus de l'`id` maximum actuel dans la collection |
| `uuid`      | Un string UUID v4 aléatoire généré par `crypto.randomUUID()`          |

Utilise `uuid` quand ton frontend attend des IDs de type string, quand tu as besoin d'IDs stables entre les redémarrages, ou quand les éléments de plusieurs collections ont besoin d'identifiants globalement uniques.

```yaml
idStrategy: uuid
```

---

### handlers

|            |                              |
| ---------- | ---------------------------- |
| Type       | `string` (chemin de fichier) |
| Par défaut | _(auto-découvert)_           |
| Flag CLI   | `--handlers <file>`          |

Chemin vers un fichier JavaScript exportant des fonctions handler pour les routes personnalisées. yRest charge le fichier au démarrage et appelle la fonction exportée dont le nom correspond à la clé `handler:` dans une entrée `_routes`.

```yaml
handlers: ./yrest.handlers.js
```

Si cette option est omise, yRest continue de détecter automatiquement `yrest.handlers.js` (ou `.mjs`) dans le répertoire de travail courant. Utilise le chemin explicite quand ton fichier de handlers a un nom différent ou se trouve dans un sous-répertoire.

---

## Exemple complet

Un fichier de configuration pour un environnement CI qui simule une latence réaliste et se réinitialise proprement entre les cycles de tests :

```yaml
# yrest.config.yml
port: 3070
host: 0.0.0.0 # exposer sur toutes les interfaces (Docker / CI runner)
base: /api/v1
watch: false # données stables pendant le cycle de tests
readonly: false # les tests ont besoin d'écrire
delay: 120 # simuler une latence réseau réaliste
snapshot: true # activer POST /_snapshot/reset entre les suites de tests
pageable: 20 # taille de page par défaut pour les endpoints de liste
idStrategy: uuid # le frontend attend des IDs de type string
handlers: ./tests/handlers.js
```

## Prochaines étapes

- [Modes serveur](/reference/server-modes/) — explication approfondie du comportement de watch, readonly, delay, snapshot et pageable
- [Référence CLI](/reference/cli-reference/) — syntaxe complète des flags pour chaque commande
- [Fonctions handler](/routes/handlers/) — la clé `handler:` et le format du fichier de handlers
