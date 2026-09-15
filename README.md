# Monitos en Fuga

Juego web competitivo para **dos jugadores en el mismo teclado**. Monito y Monita recorren una jungla
en llamas, comen todo lo que encuentran, se golpean entre ellos y tratan de no quedar atrapados dentro
del **incendio**, un area que se desplaza sola, crece, se apaga y quema por segundo.

El frontend esta hecho con **React + TypeScript** y el backend con **Express + TypeScript**. Toda la
logica de la partida (crear el estado inicial, validar acciones, calcular dano, generar comida, mover
y redimensionar el fuego y decidir el ganador) vive en el servidor; React dibuja el estado que recibe
por HTTP.

- Aplicacion publicada: **https://monitos-en-fuga.onrender.com** *(reemplazar por la URL real del servicio de Render)*
- Documentacion completa: carpeta [`docs/`](docs/)

![Pantalla de juego](docs/imagenes/pantalla-juego.png)

---

## Tecnologias

| Capa | Herramientas |
|------|--------------|
| Frontend | React 18, TypeScript, Vite, CSS propio (sin frameworks) |
| Backend | Node.js, Express 4, TypeScript |
| Comunicacion | `fetch` nativo + JSON |
| Pruebas | Playwright (Chrome) |
| Calidad | ESLint 9 (frontend y backend) + `tsc --noEmit` |
| Publicacion | Render (plan gratuito), configurado con `render.yaml` |
| CI | GitHub Actions: `lint.yml`, `e2e.yml`, `deploy.yml` |

No se usan Redux, React Router, Axios, Bootstrap, Tailwind, librerias de componentes ni motores de
juego: las reglas, el estado y los estilos son propios.

## Arquitectura

```
Navegador (React)                     Servidor (Express)
+--------------------+                +----------------------------+
|  App.tsx           |  POST /api/game|  rutas.ts                  |
|  teclado + render  | -------------> |  valida la peticion        |
|                    |  POST .../action|  juego.ts                  |
|  fetch cada 500 ms | <------------- |  reglas, estado y ganador  |
|  GET /api/game/:id |     JSON       |  partidas en memoria (Map) |
+--------------------+                +----------------------------+
                                       |
                                       +--> sirve frontend/dist (mismo puerto)
```

- **React** representa la jungla, escucha el teclado de los dos jugadores, envia cada accion y muestra
  vida, energia, puntos, tiempo, eventos y resultado.
- **Express** crea la partida, guarda su estado, valida cada accion, aplica el paso del tiempo
  (energia, movimiento y tamano del incendio, comida nueva) y decide como termina la partida.
- En produccion Express tambien sirve el frontend compilado, asi que **todo vive en un unico dominio y
  puerto**.

## Requisitos

- Node.js 20 o superior (probado con Node 22)
- npm 10 o superior
- Google Chrome instalado (para ejecutar las pruebas E2E de forma visual)

## Instalacion

```bash
git clone <url-del-repositorio>
cd Zona_Cero
npm run install:all      # instala raiz, backend y frontend
```

## Ejecucion

### Modo desarrollo (dos terminales)

```bash
npm run dev:backend      # Express en http://localhost:3001
npm run dev:frontend     # Vite en http://localhost:5173 (redirige /api al backend)
```

Se juega en <http://localhost:5173>.

### Modo produccion local (un solo puerto)

```bash
npm run build            # compila frontend (Vite) y backend (tsc)
npm start                # Express sirve el juego y la API en http://localhost:3001
```

Se juega en <http://localhost:3001>, igual que en la version publicada.

## Calidad del codigo

```bash
npm run lint                     # ESLint de backend y frontend
npm run typecheck --prefix backend
npm run typecheck --prefix frontend
```

El lint falla si hay variables sin usar, `any`, `console.log` fuera de lo permitido, `==` en lugar de
`===` o funciones exportadas sin tipo de retorno.

## Pruebas E2E

Las pruebas estan en [`e2e/tests/partida.spec.ts`](e2e/tests/partida.spec.ts) y cubren el inicio, la
interaccion principal, la comunicacion con el backend, una accion invalida y la finalizacion.

```bash
npm run build            # las pruebas usan la aplicacion compilada
npm run test:e2e         # headless (lo mismo que ejecuta GitHub Actions)
npm run test:e2e:chrome  # visual, abre Chrome (se usa en la defensa)
npm run test:e2e:report  # abre el ultimo reporte HTML
```

Playwright levanta el servidor por su cuenta (`npm start`) antes de empezar.

### Pruebas contra la aplicacion publicada

Basta con indicar la URL publica en la variable `URL_BASE`; entonces Playwright no levanta ningun
servidor local:

```powershell
# Windows PowerShell
$env:URL_BASE = "https://monitos-en-fuga.onrender.com"
npm run test:e2e:chrome   # visual en Chrome
```

```bash
# Linux / macOS / Git Bash
URL_BASE="https://monitos-en-fuga.onrender.com" npm run test:e2e:chrome
```

## API HTTP (JSON)

Todas las respuestas correctas devuelven `{ "partida": { ... } }` y los errores
`{ "error": { "codigo": "...", "mensaje": "..." } }`.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/game` | Crea una partida y devuelve el estado inicial (201) |
| `GET` | `/api/game/:id` | Devuelve el estado actual ya actualizado por el servidor |
| `POST` | `/api/game/:id/action` | Valida y aplica `mover`, `atacar` (golpear) o `defender` (hojas) |
| `POST` | `/api/game/:id/finish` | Termina la partida antes de tiempo |
| `GET` | `/api/salud` | Estado del servicio (lo usan Render y Playwright) |

Ejemplo de accion:

```bash
curl -X POST http://localhost:3001/api/game/ab12cd/action \
  -H "Content-Type: application/json" \
  -d '{"jugador":"p1","tipo":"atacar"}'
```

El detalle completo, con ejemplos de entrada y salida, esta en [`docs/api.md`](docs/api.md).

## Variables de entorno

| Variable | Donde | Valor por defecto | Para que sirve |
|----------|-------|-------------------|----------------|
| `PORT` | Backend | `3001` | Puerto de Express. Render lo define automaticamente |
| `URL_BASE` | Pruebas E2E | `http://localhost:3001` | Ejecutar las pruebas contra la aplicacion publicada |
| `RENDER_DEPLOY_HOOK` | Secreto de GitHub | — | URL del hook que dispara el deploy en Render |
| `URL_PRODUCCION` | Variable de GitHub | — | URL publica que verifica el workflow de deploy |

No se usa base de datos ni archivos de configuracion adicionales.

## Despliegue

El repositorio incluye [`render.yaml`](render.yaml). En Render se crea un **Web Service** de tipo Node
apuntando a este repositorio con:

- Build command: `npm install --prefix frontend && npm install --prefix backend && npm run build`
- Start command: `npm start`
- Health check: `/api/salud`

Cada push a `main` ejecuta el workflow `deploy.yml`, que compila, llama al deploy hook de Render,
espera a que la nueva version responda y vuelve a ejecutar las pruebas E2E contra la URL publica.
El proceso completo esta documentado en [`docs/investigacion.md`](docs/investigacion.md).

## Estructura del proyecto

```
Zona_Cero/
├── backend/                 # Express + TypeScript
│   └── src/
│       ├── index.ts         # servidor, JSON y frontend compilado
│       ├── rutas.ts         # endpoints y partidas en memoria
│       ├── juego.ts         # reglas del juego (estado, acciones, ganador)
│       └── types.ts         # tipos compartidos
├── frontend/                # React + TypeScript + Vite
│   ├── public/sprites/      # imagenes pixeladas (SVG): monos, comida, arboles y fuego
│   └── src/
│       ├── App.tsx          # pantallas, teclado y sincronizacion
│       ├── api.ts           # llamadas fetch al backend
│       ├── estilos.css      # CSS propio
│       ├── components/      # Arena, BarraSuperior, PanelJugador, ...
│       └── types/juego.ts   # tipos del estado de la partida
├── e2e/tests/               # pruebas Playwright
├── docs/                    # documentacion del proyecto
├── .github/workflows/       # lint.yml, e2e.yml, deploy.yml
├── playwright.config.ts
└── render.yaml
```

## Como se juega

| Accion | Monito | Monita |
|--------|--------|--------|
| Mover | `W` `A` `S` `D` | Flechas |
| Golpear | `F` | `L` |
| Cubrirse con hojas | `G` | `K` |

Reglas resumidas: 90 segundos de partida, 100 de vida y 60 de energia iniciales; las pizzas dan 15
puntos, el pollo frito 35 de energia, el sushi golpe doble durante 6 segundos y cada golpe acertado 8
puntos; golpear cuesta 25 de energia y solo funciona a 2 casillas o menos; cubrirse cuesta 15 y absorbe
el 60% del dano durante 3 segundos; el incendio se mueve cada 0.8 segundos, crece de 3x3 a 7x7 y vuelve
a encogerse, y quema 5 de vida por segundo; cada 2 segundos un arbol desaparece y brota otro, de otra
especie, en otro sitio. Gana quien deje al otro mono sin vida o quien tenga mas puntos cuando se acabe
el tiempo.

Las reglas completas estan en [`docs/reglas.md`](docs/reglas.md).
