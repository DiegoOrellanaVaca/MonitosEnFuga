# Decisiones tecnicas, riesgos y cambios durante el desarrollo

## 1. Como se eligio el juego

La idea partio de dos condiciones del examen: que **los dos jugadores se afecten entre si** y que
**haya elementos en movimiento**. Un juego por turnos cumplia lo primero pero se quedaba corto en lo
segundo, asi que se eligio una jungla en tiempo real sobre una cuadricula.

Para que el juego no se redujera a "perseguir al rival" se agrego un tercer actor que no controla
ningun jugador: el **incendio**, un area que se mueve sola, cambia de tamano y quema. Eso obliga a
moverse, crea situaciones distintas en cada partida y le da al backend algo que decidir aparte de
validar acciones.

Se descarto expresamente todo lo parecido a los ejercicios de clase (tres en raya, buscaminas,
adivinanzas, Space Invaders).

## 2. Arquitectura general

| Decision | Justificacion |
|----------|---------------|
| Dos carpetas (`backend/` y `frontend/`) con su propio `package.json` | Separa dependencias y permite lintear y compilar cada parte por separado, sin necesidad de monorepos ni herramientas extra |
| Un `package.json` en la raiz solo con scripts y Playwright | Da comandos unicos (`npm run build`, `npm start`, `npm run lint`, `npm run test:e2e`) y deja las pruebas E2E fuera de las dos aplicaciones, porque prueban a las dos juntas |
| Express sirve `frontend/dist` | Es la forma mas simple de cumplir "mismo dominio y puerto" y de desplegar un unico servicio en Render |
| Estado en memoria (`Map`) | Una partida dura 90 segundos; una base de datos habria sido complejidad sin beneficio. Se documenta como limitacion |

## 3. Reparto de responsabilidades

**Express (backend)**

1. Crea la partida y genera el estado inicial (arboles, comida, posicion del incendio).
2. Valida cada accion (alcance, energia, arboles, bordes, enfriamiento, partida terminada).
3. Calcula el dano, los puntos y los efectos temporales.
4. Aplica el paso del tiempo: energia, arboles que brotan y desaparecen, movimiento del incendio, su
   crecimiento, las quemaduras y la aparicion de comida.
5. Decide cuando termina la partida y quien gana.

**React (frontend)**

1. Dibuja la jungla, los paneles, el temporizador y los eventos.
2. Escucha el teclado de los dos jugadores y traduce las teclas en acciones.
3. Envia las acciones y pide el estado con `fetch`.
4. Cambia entre las pantallas de inicio, juego y resultado.

La regla que se siguio fue: **si una decision cambia el resultado de la partida, la toma el servidor**.
El frontend no calcula dano, ni puntos, ni si un movimiento es legal.

## 4. Decisiones concretas y por que

### 4.1 Peticion HTTP por accion en vez de WebSockets

El examen pide `fetch` y una API REST. Cada tecla genera una peticion `POST` y, ademas, el frontend
pide el estado con `GET` cada 500 ms para ver lo que cambia solo (tiempo, incendio, comida). Es mas
sencillo de explicar y de probar que una conexion permanente, y suficiente para dos jugadores en el
mismo navegador.

### 4.2 El servidor avanza el tiempo con marcas de tiempo, no con `setInterval`

El servidor no tiene un bucle propio. Cuando llega una peticion, la funcion `avanzarPartida` calcula
cuantos "ticks" pasaron desde la ultima vez usando `Date.now()` y aplica los efectos correspondientes:

```ts
while (ahora - partida.relojEnergia >= 1000) {
  partida.relojEnergia += 1000;
  // ...regenerar energia
}
```

Ventajas: no hay temporizadores que limpiar, el servidor no consume CPU con partidas abandonadas y el
resultado es el mismo aunque el frontend pregunte cada 500 ms o cada 2 segundos.

### 4.3 Los errores de validacion tambien son eventos

Cuando una accion es invalida, el servidor responde 400 **y** guarda el mensaje en la lista de eventos
de la partida. Asi el frontend no necesita logica aparte para mostrar errores: el componente
`AvisoEvento` muestra el ultimo evento sobre la jungla durante 2.5 segundos, sea un error, un golpe o
una comida. Esto cumple el requisito de que los errores se vean en pantalla y no en la consola.

### 4.4 Posiciones en porcentajes

Cada elemento de la jungla se coloca con `left`/`top`/`width`/`height` en porcentaje sobre un
contenedor con `aspect-ratio`. El tablero se adapta al tamano de la ventana sin recalcular nada en
JavaScript, y tanto el movimiento de los monos como el crecimiento del fuego se animan con una simple
`transition` de CSS.

El incendio ademas dibuja una llama por casilla con `background-image` y un `background-size` calculado
a partir de cuantas casillas ocupa en ese momento (variable CSS `--lado-fuego`), asi que al crecer se
ven mas llamas en vez de una imagen estirada.

### 4.5 Imagenes pixeladas propias en SVG

Los sprites (`frontend/public/sprites/`) son SVG de 8x8 "pixeles" dibujados con rectangulos y
`shape-rendering="crispEdges"`, mostrados con `image-rendering: pixelated`: Monito, Monita, pizza,
pollo frito, sushi, tres especies de arbol (ceiba, palmera y arbusto) y llama. Pesan muy poco, se ven nitidos en cualquier tamano y evitan depender
de imagenes externas.

### 4.6 Tipos duplicados entre frontend y backend

`frontend/src/types/juego.ts` repite los tipos de `backend/src/types.ts`. La alternativa era crear un
paquete compartido, lo que complicaba la compilacion y el despliegue para ganar muy poco en un
proyecto de este tamano. Se asume la duplicacion y se documenta.

### 4.7 Sin base de datos

Las partidas viven en memoria. Si el servidor se reinicia (algo habitual en el plan gratuito de
Render), las partidas en curso se pierden y el frontend muestra el error de conexion. Para este juego
es aceptable: una partida dura 90 segundos y siempre se puede empezar otra.

## 5. Riesgos tecnicos y como se redujeron

| Riesgo | Efecto posible | Estrategia aplicada |
|--------|----------------|---------------------|
| Respuestas HTTP que llegan desordenadas | La pantalla "salta" a un estado viejo | Cada peticion guarda su marca de tiempo y solo se pinta si es mas nueva que la ultima aplicada (`marcaUltimoEstado` en `App.tsx`) |
| Muchas peticiones seguidas al mantener una tecla | Cola de peticiones y movimiento con retraso | El movimiento se envia como maximo cada 130 ms y se descarta una nueva peticion del mismo jugador si la anterior sigue en curso |
| Servidor dormido en el plan gratuito de Render | La primera partida tarda en crearse | Health check en `/api/salud`, mensaje de "Creando partida..." en el boton y aviso en la documentacion de esperar unos segundos en la defensa |
| Arboles que encierren a un mono | Partida injusta | Los arboles nunca se colocan a menos de 2 casillas de una posicion inicial y solo son 14 en un tablero de 242 casillas |
| El incendio crece y se sale del tablero | El area quedaria cortada o fuera de la jungla | Cada vez que cambia el radio, `acomodarFuego` vuelve a encajar el centro dentro de los limites |
| Un arbol nuevo encierra a un mono | El jugador queda bloqueado sin haber hecho nada | Los arboles nunca brotan a 1 casilla o menos de un mono ni sobre casillas ocupadas, y el total nunca pasa de 10 |
| Elementos de la partida por encima de la pantalla final | Los monos se veian sobre el cartel de resultado | La capa de resultado usa `z-index: 100`; ver cambio 9 |
| Crecimiento de la memoria del servidor | Fuga de memoria si se crean muchas partidas | El `Map` conserva como maximo 50 partidas y elimina la mas antigua |
| Pruebas E2E fragiles por el tiempo real | Fallos intermitentes en CI | Se usan `data-testid`, esperas por respuesta HTTP (`waitForResponse`) y `expect.poll` en lugar de esperas fijas |
| Partida de 90 segundos imposible de probar en E2E | Prueba muy lenta o sin cubrir el final | Se agrego el endpoint `/finish` (boton *Terminar partida*), util para el jugador y para probar la pantalla de resultado |

## 6. Cambios importantes durante el desarrollo

1. **De "recoger con una tecla" a "comer al pasar por encima".** La primera idea tenia una tecla para
   recoger la comida. Con cinco teclas por jugador el juego se volvia incomodo, asi que la comida se
   come al entrar en su casilla. Se gano claridad y se perdio una accion invalida, que se compenso con
   las validaciones de alcance y energia del golpe.

2. **Enfriamiento del movimiento eliminado.** Al principio el servidor rechazaba movimientos
   demasiado seguidos. Con la latencia real eso llenaba el panel de eventos de errores
   `EN_ENFRIAMIENTO` que no aportaban nada. Ahora el movimiento no tiene enfriamiento (cada peticion
   mueve una casilla) y el enfriamiento se quedo solo en atacar y defender, donde si tiene sentido
   para el juego.

3. **Aparicion del incendio.** La version inicial era solo "comer y pelear". Los dos jugadores podian
   quedarse quietos en una esquina. Al agregar el area movil que hace dano, el juego gano ritmo y el
   backend gano una responsabilidad clara que no depende de las acciones del jugador.

4. **Del estado derivado en el cliente al estado derivado en el servidor.** En una version intermedia
   el frontend calculaba si el escudo seguia activo comparando marcas de tiempo. Como el reloj del
   navegador no tiene por que coincidir con el del servidor, ahora es el servidor el que envia
   `defendiendo`, `sobrecargado` y `tiempoRestanteMs` ya calculados.

5. **Boton *Terminar partida*.** Se agrego para poder cerrar una partida sin esperar 90 segundos.
   Ademas dio una forma estable de probar la pantalla de resultado en las pruebas E2E.

6. **Cambio de tematica: de la arena futurista a la jungla en llamas.** La primera version eran dos
   robots en una arena recogiendo cristales. Se cambio a Monito y Monita en una jungla que se quema,
   con pizza, pollo frito y sushi como comida. No fue solo un cambio de colores: se renombraron los
   datos del estado (`muros` paso a `arboles`, `zona` a `fuego` y los tipos de recurso a los nombres de
   las comidas) para que el codigo se lea igual que el juego que se ve en pantalla.

7. **El fuego dejo de ser un cuadrado fijo.** Antes era siempre de 3x3 y se movia cada 1.3 segundos.
   Ahora se mueve cada 0.8 segundos y su radio sube y baja entre 1 y 3 cada 3 segundos, lo que cambia
   por completo el ritmo: hay momentos de calma y momentos en los que casi un tercio del tablero es
   peligroso. La direccion del cambio se guarda en el campo `crecimiento` del estado para que el
   servidor sepa si toca crecer o apagarse.

8. **Estetica de jungla, nada futurista.** Tras el cambio de tematica la interfaz seguia pareciendo de
   ciencia ficcion (paneles azul oscuro, brillos de neon, fuente monoespaciada). Se rehizo todo el CSS:
   paneles y botones de madera con vetas dibujadas con `repeating-linear-gradient`, textos sobre
   pergamino, titulos con tipografia serif y sombra "tallada", marco de troncos alrededor del claro y
   suelo de selva. No se usaron imagenes de fondo ni fuentes externas: todo son degradados CSS, asi
   que sigue siendo facil de explicar y no agrega dependencias.

9. **Arboles vivos y correccion de la pantalla final.** Los arboles pasaron de ser fijos a cambiar
   cada 4 segundos, con tres especies distintas. Para eso cada arbol dejo de ser solo una `Posicion` y
   paso a tener `id`, `tipo` y `posicion`. En la misma revision se corrigio un error visual: los monos
   tenian `z-index: 2` dentro del tablero y la capa de resultado no tenia ninguno, asi que al ganar o
   perder los monos se dibujaban por encima del cartel. Se le dio `z-index: 100` a la capa.

10. **Nuevo nombre: de "Zona Cero" a "Monitos en Fuga".** El nombre original venia de la primera
    version, en la que una "zona cero" movil era la amenaza de la arena. Con los monos, la jungla y el
    incendio ese nombre ya no describia el juego, asi que se cambio en la interfaz, el titulo de la
    pestana, los paquetes de npm, el servicio de Render, las pruebas E2E y la documentacion.

11. **Mas bosque y menos paneles.** Se quitaron el panel de eventos y el recordatorio de reglas, y los
    paneles de Monito y Monita pasaron de los laterales a la parte de abajo. Con ese espacio libre la
    jungla crecio de 16x11 a **22x11 casillas** y ocupa casi toda la ventana; para que no quedara vacia
    se subio a 14 arboles y a 8 comidas como maximo, y los arboles cambian cada 2 segundos en lugar de
    cada 4. El panel de eventos no se elimino sin mas porque el examen exige que los errores y los
    cambios importantes se vean en pantalla: se sustituyo por un aviso flotante (`AvisoEvento`) que
    muestra el ultimo evento y desaparece solo. Las teclas de cada mono quedaron en su panel para que
    las instrucciones sigan visibles durante la partida.

## 7. Que se dejo fuera a proposito

- Multijugador por internet, WebSockets, login, base de datos y chat: no los pide el examen y habrian
  ocupado el tiempo dedicado a las reglas, las pruebas y el despliegue.
- Animaciones con varios fotogramas por personaje: el incendio ya aporta movimiento con una animacion
  CSS de dos pasos, y habria multiplicado el numero de imagenes que mantener.
- Docker: Render construye directamente desde el repositorio con `render.yaml`, asi que un Dockerfile
  solo habria agregado un paso mas que mantener. La decision esta explicada en
  [investigacion.md](investigacion.md).
- Librerias de estado o de rutas: la aplicacion tiene tres pantallas y un unico objeto de estado, algo
  que `useState` resuelve sin ayuda.
