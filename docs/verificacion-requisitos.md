# Verificacion de los requisitos del examen

Revision final del proyecto contra el enunciado. Cada fila indica donde esta la evidencia.

## Lineamientos minimos del juego

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Al menos dos jugadores | Cumple | Monito y Monita, dos jugadores humanos en el mismo teclado (`TECLAS_MOVIMIENTO` y `TECLAS_ACCION` en `frontend/src/App.tsx`) |
| Uso significativo de la pantalla | Cumple | Layout a pantalla completa: barra superior, jungla de 22x11 casillas que ocupa casi toda la ventana y los paneles de los dos monos abajo (`estilos.css`, clase `.aplicacion`) |
| Elementos en movimiento | Cumple | Los dos monos, el incendio (se desplaza cada 0.8 s y cambia de tamano cada 3 s), los arboles (brotan y desaparecen cada 2 s) y la comida que aparece y desaparece |
| Interaccion entre jugadores | Cumple | Golpes, hojas, bloqueo de casilla y competencia por la comida, todo sobre un estado compartido en el servidor |
| Estado no trivial (>= 3 tipos) | Cumple | Posicion, vida, energia, puntos, efectos temporales, tiempo, comida, arboles y fuego (`backend/src/types.ts`) |
| Reglas y finalizacion | Cumple | Inicio, acciones validas e invalidas, final por KO, por tiempo o por abandono, con empate (`docs/reglas.md`) |
| Decision estrategica | Cumple | Comer, golpear, cubrirse o huir del fuego; cada opcion cuesta energia o tiempo y tiene consecuencias distintas |
| Variabilidad entre partidas | Cumple | Especie y posicion de los arboles (tambien durante la partida), posicion inicial del incendio y tipo/posicion de la comida se sortean al azar |
| Retroalimentacion visual | Cumple | Barras de vida y energia, puntos, temporizador, etiquetas de efectos, aviso flotante con el ultimo evento y sprites pixelados (SVG) |
| Juego original, no visto en clase | Cumple | Jungla en tiempo real con un incendio movil que crece y se apaga; no es tres en raya, buscaminas, adivinanzas ni Space Invaders |

## Requisitos tecnicos obligatorios

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Frontend React + TypeScript | Cumple | `frontend/src/*.tsx`, `tsconfig.json` con `strict: true` |
| Backend Express + TypeScript | Cumple | `backend/src/*.ts`, compilado con `tsc` a `backend/dist` |
| Sin librerias externas para logica, estado, routing, comunicacion o interfaz | Cumple | Dependencias: React, ReactDOM, Express. Estado con `useState`, pantallas con una variable, estilos propios en `estilos.css` |
| Comunicacion real con `fetch` | Cumple | `frontend/src/api.ts` usa unicamente `fetch`; las pruebas E2E verifican las respuestas HTTP reales |
| JSON de entrada y salida | Cumple | `express.json()` en el servidor y `Content-Type: application/json` en todas las respuestas |
| Al menos un GET y un POST de la partida | Cumple | `GET /api/game/:id`, `POST /api/game`, `POST /api/game/:id/action`, `POST /api/game/:id/finish` |
| Mismo dominio y puerto | Cumple | Express sirve `frontend/dist` y la API en el mismo proceso (`backend/src/index.ts`) |
| Estilos propios en CSS | Cumple | `frontend/src/estilos.css` (unas 600 lineas, sin frameworks, con estetica de jungla: madera, pergamino y animaciones del fuego y de los arboles) |
| Tres GitHub Actions diferenciados | Cumple | `.github/workflows/lint.yml`, `e2e.yml`, `deploy.yml` |
| Linters de frontend y backend que fallen | Cumple | ESLint 9 en ambos con reglas propias (`eqeqeq`, `no-explicit-any`, `no-unused-vars`, `explicit-function-return-type`) y `--max-warnings 0` |
| Pruebas E2E (inicio, interaccion, backend, validacion/final) | Cumple | `e2e/tests/partida.spec.ts`, 6 pruebas |
| E2E headless en Actions y visual en Chrome | Cumple | `e2e.yml` ejecuta `npx playwright test`; en local `npm run test:e2e:chrome` abre Chrome |
| Las mismas pruebas contra la aplicacion publicada | Cumple | `URL_BASE` en `playwright.config.ts` y el job `pruebas-en-produccion` de `deploy.yml` |
| Despliegue accesible por URL | Pendiente de publicar | `render.yaml` listo; falta crear el servicio y anotar la URL en el README |
| Instrucciones para instalar, ejecutar, probar y desplegar | Cumple | `README.md` |

## Alcance funcional minimo

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Pantalla de inicio | Cumple | `components/PantallaInicio.tsx` |
| Partida jugable | Cumple | `components/Arena.tsx` + `App.tsx` |
| Instrucciones visibles | Cumple | Pantalla de inicio completa y, durante la partida, las teclas de cada mono en su panel |
| Mensajes de estados importantes | Cumple | `components/AvisoEvento.tsx`: aviso sobre la jungla con el ultimo evento del servidor (errores incluidos) |
| Pantalla de resultado | Cumple | `components/PantallaResultado.tsx` |
| Al menos una accion invalida o caso limite | Cumple | Nueve codigos de error validados en el servidor; el mas visible es golpear fuera de alcance, cubierto por una prueba E2E |
| Backend en una decision significativa | Cumple | Genera el estado inicial, valida las acciones, calcula dano y puntos, mueve y redimensiona el incendio, genera comida y decide el ganador |

## Documentacion

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Nombre y descripcion del juego | Cumple | `docs/introduccion.md` |
| Introduccion, proposito y experiencia | Cumple | `docs/introduccion.md` |
| Cantidad y tipo de jugadores | Cumple | `docs/introduccion.md` |
| Reglas y condicion de victoria | Cumple | `docs/reglas.md` |
| Elementos que se mueven | Cumple | `docs/reglas.md` |
| Estados e interaccion entre jugadores | Cumple | `docs/reglas.md` |
| Responsabilidades de React y Express | Cumple | `docs/decisiones.md` y `README.md` |
| Diseno de la API con ejemplos JSON | Cumple | `docs/api.md` |
| Boceto de la pantalla | Cumple | `docs/introduccion.md` (boceto y capturas en `docs/imagenes/`) |
| Decisiones tecnicas justificadas | Cumple | `docs/decisiones.md` |
| Riesgos tecnicos y mitigacion | Cumple | `docs/decisiones.md`, seccion 5 |
| Cambios importantes durante el desarrollo | Cumple | `docs/decisiones.md`, seccion 6 |
| Investigacion de E2E y publicacion | Cumple | `docs/investigacion.md` |
| Registro del uso de IA | Cumple | `docs/uso-ia.md` |

## Entregables

| Entregable | Estado |
|------------|--------|
| Repositorio GitHub con historial comprensible | Pendiente: crear el repositorio y subir los commits |
| Aplicacion publicada con URL funcional | Pendiente: crear el servicio en Render |
| `README.md` completo | Listo |
| Carpeta `docs/` | Listo |
| Workflows y linters | Listos (la evidencia de ejecucion aparece al subir el repositorio) |
| Codigo E2E y comando para Chrome visual | Listo (`npm run test:e2e:chrome`) |
| Dockerfile | No aplica: no se usa Docker (justificado en `docs/investigacion.md`) |
| Video de 3 a 5 minutos | Pendiente: grabarlo con la aplicacion publicada |

## Comprobaciones ejecutadas

| Comprobacion | Comando | Resultado |
|--------------|---------|-----------|
| Lint de backend y frontend | `npm run lint` | Sin errores |
| Tipos | `npm run typecheck --prefix backend` / `--prefix frontend` | Sin errores |
| Compilacion | `npm run build` | Correcta |
| Pruebas E2E headless | `npm run test:e2e` | 6 de 6 correctas |
| Reglas del juego (KO, tiempo, hojas, energia, fuego, abandono) | Script de comprobacion manual sobre `backend/dist/juego.js` | Todos los casos con el resultado esperado |
| Endpoints | `curl` a `/api/salud`, `/api/game`, `/api/game/:id`, `/api/game/:id/action` | JSON correcto, 201 al crear, 400 en accion invalida, 404 en partida inexistente |
