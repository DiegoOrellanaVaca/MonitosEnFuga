# Investigacion tecnica: pruebas E2E y publicacion

Esta parte del proyecto era la menos conocida al empezar, asi que se documenta que se busco, que se
probo y que limitaciones aparecieron.

## 1. Pruebas end-to-end

### 1.1 Herramienta elegida

Se eligio **Playwright** (`@playwright/test`).

| Criterio | Playwright | Cypress |
|----------|-----------|---------|
| Ejecutar en el Chrome instalado en la maquina | Si, con `channel: 'chrome'` | Usa su propio navegador o Chrome del sistema |
| Levantar el servidor antes de las pruebas | Incluido (`webServer` en la configuracion) | Necesita una herramienta aparte |
| Peticiones HTTP directas dentro de la prueba | Incluido (`request`) | Con `cy.request` |
| Configuracion en TypeScript | Directa | Necesita mas ajustes |

Lo que inclino la balanza fue `webServer`: la misma configuracion sirve para local y para GitHub
Actions, y la opcion `channel: 'chrome'` permite cumplir el requisito de mostrar la prueba en Chrome
de forma visual durante la defensa.

### 1.2 Fuentes consultadas

- Documentacion oficial de Playwright: <https://playwright.dev/docs/intro>
- Configuracion del servidor de pruebas: <https://playwright.dev/docs/test-webserver>
- Navegadores y canales (`channel: 'chrome'`): <https://playwright.dev/docs/browsers>
- Localizadores por `data-testid`: <https://playwright.dev/docs/locators#locate-by-test-id>
- Esperas resistentes (`expect.poll`): <https://playwright.dev/docs/test-assertions#expectpoll>
- Playwright en GitHub Actions: <https://playwright.dev/docs/ci-intro>
- Documentacion de Render sobre servicios Node y deploy hooks:
  <https://render.com/docs/deploy-hooks> y <https://render.com/docs/web-services>

### 1.3 Configuracion

`playwright.config.ts` (raiz del proyecto):

- `testDir: './e2e/tests'`;
- `baseURL` = `http://localhost:3001` o el valor de `URL_BASE` si existe;
- `channel: 'chrome'` para usar Google Chrome;
- `webServer` con `npm run start` y espera a `/api/salud`; **si `URL_BASE` esta definida, no se levanta
  ningun servidor** y las pruebas van contra la aplicacion publicada;
- `workers: 1` y `fullyParallel: false`, porque las partidas viven en memoria en un unico servidor y
  asi las pruebas son deterministas;
- reporte `list` en consola y `html` como artefacto.

### 1.4 Que cubren las pruebas

Archivo [`e2e/tests/partida.spec.ts`](../e2e/tests/partida.spec.ts), seis pruebas:

| Prueba | Que demuestra |
|--------|----------------|
| Pantalla de inicio | La aplicacion carga y muestra titulo, instrucciones y boton |
| Iniciar partida | `POST /api/game` responde 201 y la arena aparece con los dos jugadores |
| Mover a Monito | La interaccion principal: se presiona una tecla y el servidor devuelve la nueva posicion |
| Golpe fuera de alcance | Validacion del backend: responde 400 con `FUERA_DE_ALCANCE` y el mensaje se ve en pantalla |
| Terminar partida | Finalizacion: aparece la pantalla de resultado con ganador y motivo, y se puede jugar de nuevo |
| API JSON | `GET`, `POST`, cabecera `application/json` y respuesta 404 para una partida inexistente |

### 1.5 Como se ejecutan

```bash
npm run build            # las pruebas usan la aplicacion compilada
npm run test:e2e         # headless (igual que en GitHub Actions)
npm run test:e2e:chrome  # visual en Chrome (defensa)
```

Contra la aplicacion publicada:

```powershell
$env:URL_BASE = "https://monitos-en-fuga.onrender.com"
npm run test:e2e:chrome
```

Resultado de la ultima ejecucion local en headless: **6 pruebas, 6 correctas, ~13 segundos**.

### 1.6 Limitaciones encontradas

1. **El juego avanza solo.** Como el incendio se mueve, cambia de tamano y quema, la vida de los monos
   cambia sin que la prueba haga nada. Por eso las comprobaciones no fijan valores exactos de vida,
   sino hechos verificables (la posicion cambio, el codigo de error es el esperado, aparecio la
   pantalla de resultado).
2. **Esperas.** Las esperas fijas daban fallos intermitentes. Se sustituyeron por `waitForResponse`
   (esperar la respuesta real del backend) y `expect.poll` (reintentar hasta que el atributo cambie).
3. **Duracion de la partida.** Esperar 90 segundos por prueba era inviable; por eso la finalizacion se
   prueba con el boton *Terminar partida*.
4. **Chrome vs Chromium.** `channel: 'chrome'` necesita Google Chrome instalado. En local ya estaba;
   en GitHub Actions hay que instalarlo con `npx playwright install --with-deps chrome`.
5. **Primera peticion en Render.** Contra produccion, la primera prueba puede tardar mas de 30
   segundos si el servicio estaba dormido; por eso el `timeout` general es de 45 segundos.

## 2. Publicacion de la aplicacion

### 2.1 Servicio elegido

**Render** (<https://render.com>), plan gratuito, tipo *Web Service* con runtime Node.

Se comparo con:

| Opcion | Por que se descarto |
|--------|---------------------|
| GitHub Pages | Solo sirve archivos estaticos: no puede ejecutar Express |
| Vercel / Netlify | El frontend es facil, pero el backend tendria que convertirse en funciones serverless y el estado en memoria se perderia entre invocaciones |
| Railway / Fly.io | Funcionan bien, pero Render es el servicio recomendado en el enunciado y su plan gratuito basta |

Render encaja porque el proyecto es **un unico proceso Node** que sirve la API y el frontend, que es
exactamente lo que pide el examen ("mismo dominio y puerto").

### 2.2 Configuracion del servicio

Archivo [`render.yaml`](../render.yaml):

```yaml
services:
  - type: web
    name: monitos-en-fuga
    runtime: node
    plan: free
    buildCommand: npm install --prefix frontend && npm install --prefix backend && npm run build
    startCommand: npm start
    healthCheckPath: /api/salud
    envVars:
      - key: NODE_VERSION
        value: '22'
```

La instalacion se hace solo en `frontend/` y `backend/` porque Playwright, que es una dependencia
de la raiz, no se necesita en el servidor publicado.

Pasos seguidos:

1. Subir el repositorio a GitHub.
2. En Render: *New* -> *Web Service* -> conectar el repositorio.
3. Confirmar los comandos de build y start (Render los toma de `render.yaml`).
4. Esperar el primer despliegue y anotar la URL publica.
5. Crear un **Deploy Hook** en *Settings* -> *Deploy Hook* y guardarlo en GitHub como el secreto
   `RENDER_DEPLOY_HOOK`.
6. Guardar la URL publica en GitHub como la variable `URL_PRODUCCION`.

### 2.3 Puerto y variables de entorno

- Render asigna el puerto mediante la variable `PORT`. El servidor la lee asi:

  ```ts
  const puerto = Number(process.env.PORT) || 3001;
  ```

  Si se ignorara `PORT`, Render marcaria el despliegue como fallido porque no detectaria ningun puerto
  abierto.
- No hacen falta mas variables en el servidor: no hay base de datos ni claves.
- `URL_BASE` solo se usa en las pruebas E2E.
- En GitHub: el secreto `RENDER_DEPLOY_HOOK` y la variable `URL_PRODUCCION`.

### 2.4 Despliegue automatico

El workflow [`deploy.yml`](../.github/workflows/deploy.yml) hace, en cada push a `main`:

1. instala dependencias y **compila** frontend y backend (si falla, no se despliega nada);
2. comprueba que el secreto y la variable existan y avisa con un mensaje claro si faltan;
3. llama al deploy hook de Render con `curl`;
4. espera hasta 10 minutos a que `URL_PRODUCCION/api/salud` responda;
5. en un segundo job, vuelve a ejecutar **las mismas pruebas E2E contra la URL publica**
   (`URL_BASE=${{ vars.URL_PRODUCCION }}`).

Esto es lo que permite, durante la defensa, hacer un cambio, subirlo y ver como llega a la aplicacion
publicada con la validacion de linters, pruebas y deployment.

### 2.5 Sobre Docker

**No se usa Docker.** Render construye el proyecto directamente desde el repositorio con Node 22, y
los comandos de build y arranque son dos lineas. Un `Dockerfile` habria significado mantener una
imagen, una version de Node y un `.dockerignore` sin ninguna ventaja para este proyecto. Si en el
futuro hiciera falta desplegar en un servicio que solo acepte contenedores, la imagen seria sencilla:
copiar el proyecto, `npm run install:all && npm run build`, exponer `PORT` y arrancar con
`npm start`.

### 2.6 Limitaciones del plan gratuito

- El servicio **se duerme** tras unos 15 minutos sin trafico y la siguiente peticion puede tardar
  entre 30 y 60 segundos. Antes de la defensa conviene abrir la URL para "despertarlo".
- Cada despliegue tarda unos 2 o 3 minutos en construir.
- Al reiniciarse el servicio, las partidas en memoria se pierden.
