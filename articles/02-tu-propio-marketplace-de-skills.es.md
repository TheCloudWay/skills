# Monta tu propio marketplace de Agent Skills (Cursor + Claude Code)

*Un repo para gobernar las skills de tu equipo — versionado, compartible y de auto-instalación.*

En el [post anterior](https://github.com/TheCloudWay/gh-action-hello-world) construimos una GitHub
Action y una skill que arma nuevas. Genial. Ahora multiplícalo por un equipo: todos copiando a
mano archivos `SKILL.md` a sus máquinas, versiones que se desincronizan, el caos de "¿espera, qué
skill tenés vos?".

La solución es una **única fuente de verdad**: un repo de Git que guarda todas tus skills,
funciona en *ambos* Cursor y Claude Code, se versiona solo y — para Claude Code — funciona además
como un **marketplace de plugins** instalable. Eso es exactamente
[`TheCloudWay/skills`](https://github.com/TheCloudWay/skills). Vamos a construirlo.

## Los dos clientes cargan skills distinto

Esta es la idea clave que moldea todo:

- **Cursor** lee skills desde una carpeta: `~/.cursor/skills/` (personal) o `.cursor/skills/`
  (por proyecto). Sin concepto de marketplace. Si los archivos están ahí, la skill existe.
- **Claude Code** tiene un sistema de **marketplace de plugins**. Lo apuntas a un repo de Git, lo
  clona, encuentra un `marketplace.json` e instala plugins (que pueden empaquetar skills).

Lo lindo: ambos consumen el mismo formato `SKILL.md`. Así que un repo puede servir a los dos —
solo lo presentamos de dos maneras.

## La estructura del repo

```
skills/                          # las skills (una carpeta cada una, con SKILL.md)
└── create-github-action/
    ├── SKILL.md
    ├── references/
    └── templates/
.claude-plugin/
├── marketplace.json             # definición del marketplace de Claude Code
└── plugin.json                  # el plugin que empaqueta todo lo de skills/
.releaserc.json                  # auto-versionado (más sobre esto abajo)
package.json
README.md
```

Las skills van bajo `skills/`. La carpeta `.claude-plugin/` convierte todo el repo en un
marketplace de Claude Code cuyo único plugin empaqueta cada skill de `skills/`.

## Los manifiestos de Claude Code

`marketplace.json` anuncia el catálogo y sus plugins:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "thecloudway-skills",
  "description": "The Cloud Way shared Agent Skills.",
  "owner": { "name": "The Cloud Way", "url": "https://github.com/TheCloudWay" },
  "plugins": [
    {
      "name": "thecloudway-skills",
      "description": "Scaffold GitHub Actions and more.",
      "source": "./",
      "category": "development"
    }
  ]
}
```

`source: "./"` significa "el plugin es este repo". Claude entonces busca una carpeta `skills/` en
la raíz del plugin — que es justo donde viven las nuestras.

`plugin.json` es la cédula de identidad del plugin:

```json
{
  "name": "thecloudway-skills",
  "version": "1.0.0",
  "description": "The Cloud Way shared Agent Skills.",
  "author": { "name": "The Cloud Way" }
}
```

Tip: valida antes de pushear con `claude plugin validate .`.

## Instalarlo — y cómo Claude sabe siquiera que existe

Una pregunta que confunde a muchos: en una laptop recién sacada de la caja, ¿cómo sabe Claude Code
que tu repo es un marketplace?

No lo sabe. No hay registro central. *Tú* se lo dices, con el atajo `owner/repo` de GitHub:

```bash
claude plugin marketplace add TheCloudWay/skills
claude plugin install thecloudway-skills@thecloudway-skills
```

Por debajo, `add` resuelve `TheCloudWay/skills` a una URL de Git, lo **clona** con las credenciales
de Git del propio usuario, valida `marketplace.json` y registra la fuente localmente. Es
básicamente `git remote add` con pasos extra. El único marketplace que Claude conoce de fábrica es
el oficial de Anthropic; cualquier otro lo agregas explícitamente (o lo empujas con managed
settings — ver abajo).

Para **Cursor** no hay marketplace, así que clonas una vez y enlazas con symlinks las skills que
quieras:

```bash
git clone https://github.com/TheCloudWay/skills.git ~/tcw-skills
mkdir -p ~/.cursor/skills
for d in ~/tcw-skills/skills/*/; do
  ln -sfn "$d" ~/.cursor/skills/$(basename "$d")
done
```

Los symlinks son la salsa secreta: un `git pull` actualiza al instante cada skill, sin volver a
copiar nada.

## Que se versione solo

Bumpear `plugin.json` a mano en cada cambio es justo el tipo de tarea tediosa que queremos
eliminar. Así que apuntamos semantic-release al repo, pero con un giro: la versión oficial vive en
`.claude-plugin/plugin.json`, no en `package.json`. Usamos `@semantic-release/exec` para escribir
la versión calculada en el manifiesto del plugin:

```json
{
  "branches": ["master"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/exec", {
      "prepareCmd": "node scripts/set-plugin-version.js ${nextRelease.version}"
    }],
    ["@semantic-release/git", {
      "assets": [".claude-plugin/plugin.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

El scriptcito es poco glamoroso y confiable:

```javascript
const fs = require('fs');
const version = process.argv[2];
const file = '.claude-plugin/plugin.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
json.version = version;
fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
```

Ahora el flujo es: agregas una skill con un commit `feat:`, mergeas a `master` y la versión del
plugin se bumpea sola. Agregar skill → `feat` → minor. Arreglar un typo en un template → `fix` →
patch. Editar un doc → `docs` → sin release. Los consumidores toman la nueva versión con
`claude plugin marketplace update thecloudway-skills`.

> Por qué importa el bump de versión: Claude cachea el plugin instalado **por versión**. Un simple
> refresh del marketplace no jala las skills nuevas a una instalación existente — la versión tiene
> que cambiar. Por eso justamente lo automatizamos.

## A nivel organización: managed settings

Decirle a cada compañero que corra dos comandos funciona, pero puedes hacerlo mejor. Los **managed
settings** de Claude Code pueden declarar el marketplace y habilitar el plugin automáticamente en
cada máquina:

```json
{
  "extraKnownMarketplaces": {
    "thecloudway-skills": {
      "source": { "source": "github", "repo": "TheCloudWay/skills" }
    }
  },
  "enabledPlugins": {
    "thecloudway-skills@thecloudway-skills": true
  }
}
```

Lo entregas de una de dos formas:

1. **Consola admin** (Claude for Teams/Enterprise): *Admin Settings → Claude Code → Managed
   settings*, pegas el JSON. Llega a los equipos al iniciar sesión y se refresca cada hora. Máxima
   prioridad, el usuario no la puede sobreescribir. Necesitas ser admin **de tu propia org de
   Claude** — no de Anthropic.
2. **MDM / archivo** (`/Library/Application Support/ClaudeCode/managed-settings.json` en macOS, o
   una política plist/registry vía Jamf/Intune). Úsalo si no tienes plan Teams/Enterprise o
   necesitas enforcement offline.

Una advertencia honesta: los managed settings declaran el marketplace y habilitan el plugin, pero
**no entregan credenciales de Git**. Si tu repo es privado, cada máquina igual necesita acceso de
lectura para clonarlo. Asegúrate de que tu equipo lo tenga, o la instalación falla en silencio.

## Público, privado y el directorio de Anthropic

- **Repo privado del equipo** (recomendado para skills internas): mantenlo privado, distribuye con
  `marketplace add` o managed settings. Listo.
- **Directorio público de Anthropic**: es un catálogo aparte y curado. Envías plugins de terceros
  por un [formulario](https://clau.de/plugin-directory-submission) y ellos revisan calidad y
  seguridad. No necesitas ser admin de Anthropic — pero el repo debe ser público y con una licencia
  real. Usa esto solo para skills que de verdad quieras compartir con el mundo.

## La recompensa

Un repo. Se versiona solo desde tus mensajes de commit. Sirve a Cursor por symlinks y a Claude
Code por un marketplace de verdad. Los nuevos del equipo están a un comando (o cero, con managed
settings) de toda tu librería de skills — en la versión que tú quisiste.

Combina esto con la [skill de GitHub Action de la parte uno](https://github.com/TheCloudWay/gh-action-hello-world)
y tienes un bucle que se refuerza solo: una skill que arma tu tooling, distribuida por una
infraestructura que se actualiza sola. Eso es *the cloud way*.

*Repo: [TheCloudWay/skills](https://github.com/TheCloudWay/skills). MIT. Forkéalo y hazlo tuyo.*
