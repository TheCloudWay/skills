# Crea una GitHub Action — y una Skill que escriba la próxima por ti

*O: cómo dejé de copiar y pegar boilerplate y le enseñé a mi IA a hacerlo.*

Todos hemos pasado por esto. Necesitas "una GitHub Action chiquita". Cuarenta y cinco minutos
después estás hasta el cuello en la sintaxis de `action.yml`, googleando por qué importa la
carpeta `dist/`, cableando semantic-release y cuestionando tus decisiones de vida. Y a la semana
siguiente necesitas *otra* action y repites todo el baile.

Este post es la cura. Vamos a construir **una sola vez** una GitHub Action de JavaScript limpia y
lista para producción, y luego empaquetamos ese conocimiento en una **Agent Skill** para que
Cursor o Claude Code te armen la siguiente en segundos — siguiendo exactamente las mismas
convenciones.

Dos repos de ejemplo acompañan este post:

- La action: [`TheCloudWay/gh-action-hello-world`](https://github.com/TheCloudWay/gh-action-hello-world)
- La skill (dentro del marketplace): [`TheCloudWay/skills`](https://github.com/TheCloudWay/skills)

Vamos.

## Parte 1 — La action

### Anatomía de una action de JavaScript

Una action de JS es sorprendentemente pequeña. En el fondo son tres cosas:

1. `action.yml` — el manifiesto: nombre, inputs, outputs y cómo se ejecuta.
2. `src/index.js` — tu lógica, usando el toolkit `@actions/core`.
3. `dist/index.js` — la versión **empaquetada** que GitHub realmente ejecuta.

Este es nuestro manifiesto:

```yaml
name: 'Hello World'
description: 'A friendly Hello World GitHub Action written in JavaScript.'
author: 'The Cloud Way'

branding:
  icon: 'smile'
  color: 'purple'

inputs:
  name:
    description: 'Who to greet.'
    required: true
  greeting:
    description: 'The greeting word to use.'
    required: false
    default: 'Hello'

outputs:
  message:
    description: 'The full greeting message that was produced.'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

Fíjate en `main: 'dist/index.js'`. No `src/`. Ese es el giro de trama de todo el post.

### ¿Por qué demonios commiteamos `dist/`?

Cuando alguien escribe `uses: TheCloudWay/gh-action-hello-world@v1`, GitHub clona tu repo en ese
ref y ejecuta `dist/index.js` **directamente**. No hay `npm install`. No hay build. No hay piedad.
Lo que esté en `dist/` en ese tag es lo que corre.

Por eso empaquetamos nuestro código fuente (junto con sus dependencias) en un solo archivo con
[`@vercel/ncc`](https://github.com/vercel/ncc) y commiteamos el resultado. Sí, commitear el output
del build se siente sucio. Hazlo igual — es la convención aceptada para actions de JS, y vamos a
poner barandas para que el bundle nunca se desincronice del código.

### La lógica

```javascript
const core = require('@actions/core');

async function run() {
  try {
    const name = core.getInput('name', { required: true });
    const greeting = core.getInput('greeting') || 'Hello';

    const message = `${greeting}, ${name}!`;

    core.info(message);
    core.setOutput('message', message);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

module.exports = { run };

// Solo se auto-ejecuta como entrypoint (no al importarlo en los tests).
if (require.main === module) {
  run();
}
```

Dos detalles pequeños que pagan dividendos después:

- **Exportamos `run`** y solo auto-ejecutamos cuando el archivo es el entrypoint. Así el módulo se
  puede importar desde los tests sin que se dispare al hacer `require`.
- Los inputs llegan como variables de entorno `INPUT_<NOMBRE>` (en mayúsculas). Por eso puedes
  probar local con `INPUT_NAME=Cloud node dist/index.js`.

### Tests, de los baratos

Sin framework de tests, sin config. Node 20 trae un runner integrado:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { run } = require('../src/index.js');

test('falla cuando falta name', async () => {
  await run();
  assert.strictEqual(process.exitCode, 1);
});
```

Se corre con `node --test`. Un detalle: `core.setFailed()` pone `process.exitCode = 1` de forma
global, así que resetéalo en un hook `afterEach` para que los tests no se contaminen entre sí.

### Empaquetado

```json
{
  "scripts": {
    "build": "ncc build src/index.js -o dist --source-map --license licenses.txt",
    "test": "node --test",
    "prepare": "npm run build"
  }
}
```

El hook `prepare` hace que `npm install` también construya `dist/`. Después de editar `src/`,
corres `npm run build` y commiteas el bundle regenerado.

### Releases automáticos (la parte que nadie disfruta configurar)

Dejamos que [semantic-release](https://semantic-release.gitbook.io/) haga el versionado, guiado
por [Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` → patch (`1.0.1`)
- `feat:` → minor (`1.1.0`)
- `feat!:` o un footer `BREAKING CHANGE:` → major (`2.0.0`)
- `docs:` / `chore:` / `ci:` → sin release

Dos canales: `master` para estable, `beta` para prereleases (`1.2.0-beta.1`). En cada release
estable además movemos un **tag mayor flotante** (`v1`) para que los consumidores fijen `@v1` y
reciban actualizaciones no-breaking automáticamente. Eso último es un scriptcito de shell
enganchado al `successCmd` de semantic-release.

El workflow de CI corre en los PRs y hace algo deliciosamente paranoico — reconstruye `dist/` y
falla si difiere de lo que commiteaste:

```bash
if [ -n "$(git status --porcelain dist)" ]; then
  echo "::error::dist/ está desactualizado. Corre 'npm run build' y commitea los cambios."
  exit 1
fi
```

Se acabó el "funciona en mi máquina pero la action publicada corre el código de la semana pasada".

### A producción

```bash
npm install && npm test && npm run build
git init -b master && git add -A && git commit -m "feat: hello world github action"
gh repo create TheCloudWay/gh-action-hello-world --public --source=. --push
git branch beta && git push -u origin beta
```

semantic-release publica `v1.0.0`, taggea `v1` y escribe un changelog. Ahora cualquiera puede:

```yaml
- uses: TheCloudWay/gh-action-hello-world@v1
  with:
    name: Cloud
    greeting: Hey
```

Una action real, versionada y auto-publicable. Nada mal. Pero esto no lo volvemos a hacer a mano
nunca más.

## Parte 2 — La Skill que escribe la próxima

Cursor y Claude Code soportan **Agent Skills**: una carpeta con un `SKILL.md` que le enseña al
agente a hacer una tarea. Una buena skill es concisa, apunta a archivos de referencia para el
detalle pesado y trae **templates** que el agente puede copiar.

Nuestra skill `create-github-action` tiene justo esa forma:

```
create-github-action/
├── SKILL.md                 # el workflow + convenciones (cortito)
├── references/
│   ├── conventions.md       # por qué se commitea dist, versionado, archivo por archivo
│   └── repo-setup.md        # comandos gh, protección de ramas opcional
└── templates/               # todo el boilerplate, parametrizado
    ├── action.yml
    ├── src/index.js
    ├── test/index.test.js
    ├── package.json
    ├── .releaserc.json
    ├── .github/workflows/{release,ci}.yml
    └── ... (LICENSE, README, dependabot, editorconfig, ...)
```

El frontmatter del `SKILL.md` es lo que hace que el agente eche mano de ella:

```markdown
---
name: create-github-action
description: >-
  Scaffold a new JavaScript GitHub Action repository following solid conventions...
  Use when the user wants to create a new GitHub Action, mentions action.yml,
  inputs/outputs for an action, or publishing an action to a GitHub org.
---
```

Ese `description` hace trabajo de verdad: se inyecta en el contexto del agente, y uno bueno (en
tercera persona, con el **qué** hace y el **cuándo** usarlo) es la diferencia entre una skill que
se dispara y una que junta polvo.

El cuerpo es un workflow corto y numerado: recolectar requisitos (org, nombre, inputs, outputs,
idea) → copiar templates y reemplazar placeholders (`{{ORG}}`, `{{REPO_NAME}}`, `{{ACTION_NAME}}`,
…) → implementar `src/index.js` → build + test → crear el repo y pushear. Las partes frágiles que
deben ser exactas (la config de release, el chequeo de `dist` en CI) viven como **archivos
template**, no como prosa que el agente podría parafrasear. Ese es el truco: poca libertad para el
boilerplate, mucha libertad para la lógica.

### Usándola

En Cursor o Claude Code, simplemente dices:

> "Crea una nueva GitHub Action llamada *Slack Notifier* con inputs `webhook` (requerido, secreto)
> y `message` (requerido), que postee el mensaje a Slack."

El agente carga la skill, pregunta lo que falte, arma el repo completo desde los templates,
escribe la lógica real, corre los tests y pushea. Cuarenta y cinco minutos de boilerplate se
vuelven una conversación de dos minutos — y cada action que tu equipo publica se ve igual.

## La recompensa

Pensamos lo difícil una sola vez: la disciplina de `dist/`, el pipeline de release, el tag
flotante, la guarda de CI. Luego congelamos ese pensamiento en una skill. La primera action costó
esfuerzo de verdad. Las próximas cien son una oración.

En el [próximo post](https://github.com/TheCloudWay/skills) subimos un nivel: cómo hostear tu
propio **marketplace de Agent Skills** para que todo tu equipo — en Cursor y en Claude Code —
reciba estas skills automáticamente.

*Repos: [gh-action-hello-world](https://github.com/TheCloudWay/gh-action-hello-world) ·
[skills](https://github.com/TheCloudWay/skills). Ambos MIT. Róbalos sin culpa.*
