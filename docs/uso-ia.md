# Registro del uso de inteligencia artificial

El examen permite usar agentes de IA como asistentes y exige registrar las solicitudes relevantes,
que se incorporo y que se verifico. Este archivo es ese registro.

**Herramienta utilizada:** Claude (asistente de programacion), en sesiones de trabajo sobre este
repositorio.

## Como se uso

La IA se uso como apoyo para escribir codigo repetitivo, revisar configuraciones que no se dominaban
(Playwright, GitHub Actions, Render) y proponer alternativas. Cada respuesta se ejecuto y se comprobo
antes de darla por buena; lo que no funciono o no se entendia se cambio.

## Solicitudes relevantes y que se hizo con ellas

| # | Solicitud a la IA | Que se incorporo | Como se verifico |
|---|-------------------|------------------|------------------|
| 1 | "Propon una mecanica para dos jugadores en la misma pantalla que use posicion, vida, energia, puntos y tiempo" | La base del juego: mover, golpear, cubrirse, comer | Se contrasto con los lineamientos del examen punto por punto antes de programar |
| 2 | "Como avanzar el tiempo en el servidor sin usar setInterval" | El patron de relojes con `Date.now()` en `avanzarPartida` | Se probo dejando la partida sin peticiones unos segundos: al volver a consultar, la energia y el tiempo estaban correctos |
| 3 | "Estructura minima de un backend Express con TypeScript" | `index.ts`, `rutas.ts`, `juego.ts`, `types.ts` y el `tsconfig.json` | `npm run build` y `npm run lint` sin errores; endpoints probados con `curl` |
| 4 | "Como colocar elementos en una cuadricula que se adapte a la pantalla" | Posiciones en porcentaje sobre un contenedor con `aspect-ratio` | Se probo cambiando el tamano de la ventana del navegador; la jungla mantiene la forma |
| 5 | "Como evitar que respuestas HTTP desordenadas hagan saltar la pantalla" | La marca de tiempo `marcaUltimoEstado` en `App.tsx` | Se probo manteniendo teclas pulsadas: el personaje ya no retrocede a posiciones viejas |
| 6 | "Configuracion de Playwright que sirva para local y para la URL publicada" | `playwright.config.ts` con `webServer` condicionado a `URL_BASE` | `npm run test:e2e` en local y la misma suite con `URL_BASE` apuntando al despliegue |
| 7 | "Que pruebas E2E son suficientes para este proyecto" | Las seis pruebas de `e2e/tests/partida.spec.ts` | Se ejecutaron varias veces seguidas para descartar fallos intermitentes |
| 8 | "Workflows de GitHub Actions para lint, E2E y deploy en Render" | Los tres archivos de `.github/workflows/` | Se reviso cada paso a mano y se comprobo que los comandos son los mismos que funcionan en local |
| 9 | "Como publicar en Render un proyecto con frontend y backend en un solo servicio" | `render.yaml`, la lectura de `process.env.PORT` y el health check | Despliegue real y comprobacion de `/api/salud` y del juego en la URL publica |
| 10 | "Cambia la tematica a monos en una jungla que se incendia, con comida en vez de cristales, y haz que el fuego se mueva mas rapido y cambie de tamano" | Sprites nuevos, paleta verde/naranja, renombrado de `muros` a `arboles` y de `zona` a `fuego`, y el ciclo de crecimiento del incendio | Se volvieron a ejecutar lint, compilacion y las 6 pruebas E2E, y se reviso el juego en el navegador con capturas |
| 11 | "La estetica tiene que ser de jungla y nada futurista; los arboles deben aparecer y desaparecer al azar con formas distintas; los monos se ven encima de la pantalla final" | CSS de madera y pergamino, tres especies de arbol que se renuevan cada 4 s y `z-index` en la capa de resultado | Capturas de las tres pantallas; comprobacion automatica de que los arboles cambian de sitio; script que verifica que nunca hay mas de 10 ni brotan encima o al lado de un mono |
| 13 | "Elimina las secciones de eventos y Recuerda, pon ahi la vida y energia de Monito y Monita, agranda el bosque y haz que los arboles cambien mas rapido y haya un poco mas" | Paneles de los monos abajo, jungla de 22x11, 14 arboles que cambian cada 2 s, 8 comidas maximo y un aviso flotante que sustituye al panel de eventos para no perder la retroalimentacion de errores que exige el examen | Prueba E2E del golpe fuera de alcance adaptada al aviso; capturas midiendo que la jungla y los paneles caben en la ventana; lint, tipos y 6 pruebas E2E correctas |
| 12 | "Quiero que el juego se llame Monitos en Fuga" | Cambio del nombre en la interfaz, la pestana del navegador, los paquetes, `render.yaml`, la prueba E2E de la pantalla de inicio y la documentacion | Busqueda de "Zona Cero" en todo el repositorio sin resultados de la marca antigua; compilacion, lint y pruebas E2E correctas |

## Respuestas de la IA que se descartaron o se corrigieron

- **Enfriamiento del movimiento en el servidor.** La primera version validaba que no llegaran dos
  movimientos demasiado seguidos. En la practica llenaba el panel de eventos de errores inutiles, asi
  que se quito (ver [decisiones.md](decisiones.md), cambio 2).
- **Calcular en el navegador si el escudo seguia activo.** Se descarto porque depende del reloj del
  cliente; ahora el servidor envia `defendiendo` y `sobrecargado` ya calculados.
- **Sugerencias de librerias externas.** Se rechazo cualquier propuesta que implicara Tailwind, Axios,
  React Router o librerias de componentes, porque el examen las prohibe.
- **Tecla para recoger recursos.** Se simplifico: la comida se come al entrar en su casilla.
- **Dejar el fuego siempre del mismo tamano.** Se descarto porque el juego se volvia previsible; el
  incendio que crece y se apaga obliga a cambiar de plan varias veces por partida.

## Que se verifico en todo el proyecto

1. `npm run lint` y `npm run typecheck` en frontend y backend, sin errores ni avisos.
2. Cada endpoint probado manualmente con `curl`, revisando el JSON de entrada y de salida.
3. Partida completa jugada en el navegador: movimiento, golpes, hojas, comida, quemaduras del
   incendio, final por tiempo y final por KO.
4. Acciones invalidas provocadas a proposito (golpear de lejos, golpear sin energia, moverse contra un
   arbol, actuar con la partida terminada) comprobando que el mensaje aparece en pantalla.
5. Pruebas E2E en headless y en Chrome visual.
6. Despliegue en Render y ejecucion de las pruebas contra la URL publica.

## Puntos a repasar antes de la defensa

Estos son los puntos del codigo que conviene poder explicar sin dudar:

- `backend/src/juego.ts`: como se valida un golpe (energia, alcance, enfriamiento, hojas), como el
  incendio se mueve y cambia de tamano, y como se decide el ganador.
- `avanzarPartida`: por que se usan bucles `while` con relojes en vez de temporizadores.
- `frontend/src/App.tsx`: los dos `useEffect` (teclado y sincronizacion) y por que se limpian.
- `frontend/src/api.ts`: por que las rutas son relativas y que devuelve cada funcion.
- `playwright.config.ts`: que hace `webServer` y que cambia cuando se define `URL_BASE`.
- `.github/workflows/deploy.yml`: el orden compilar -> desplegar -> verificar -> probar en produccion.
