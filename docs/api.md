# API HTTP REST de Monitos en Fuga

La API vive en [`backend/src/rutas.ts`](../backend/src/rutas.ts) y usa **JSON tanto en la entrada como
en la salida**. Todas las rutas cuelgan de `/api`.

Como Express sirve tambien el frontend compilado, el navegador llama a rutas relativas (`/api/...`):
frontend y backend comparten dominio y puerto, en local (`http://localhost:3001`) y en produccion.

## Convenciones

| Caso | Forma de la respuesta |
|------|-----------------------|
| Correcto | `{ "partida": { ...estado completo... } }` |
| Error | `{ "error": { "codigo": "...", "mensaje": "..." } }` |
| Accion invalida | `{ "error": { ... }, "partida": { ... } }` con codigo HTTP 400 |

En las acciones invalidas se devuelve tambien la partida porque el error se registra como evento y la
pantalla lo muestra como aviso sobre la jungla.

## Resumen de endpoints

| Metodo | Ruta | Entrada | Salida | Codigo |
|--------|------|---------|--------|--------|
| `POST` | `/api/game` | `{}` | Partida nueva | 201 |
| `GET` | `/api/game/:id` | — | Partida actualizada | 200 / 404 |
| `POST` | `/api/game/:id/action` | Accion | Partida actualizada | 200 / 400 / 404 |
| `POST` | `/api/game/:id/finish` | `{}` | Partida terminada | 200 / 404 |
| `GET` | `/api/salud` | — | Estado del servicio | 200 |

---

## POST /api/game

Crea una partida: genera los arboles, la comida inicial, la posicion del incendio y coloca a los dos
monos. Es el primer ejemplo de "el backend participa en una decision significativa": el mapa lo decide
el servidor, no el navegador.

**Solicitud**

```http
POST /api/game
Content-Type: application/json

{}
```

**Respuesta 201** (recortada: los arreglos `arboles` y `recursos` traen mas elementos)

```json
{
  "partida": {
    "id": "g5opcz",
    "estado": "en_curso",
    "ganador": null,
    "motivoFin": null,
    "tiempoRestanteMs": 90000,
    "jugadores": {
      "p1": {
        "id": "p1",
        "nombre": "Monito",
        "posicion": { "x": 1, "y": 9 },
        "vida": 100,
        "energia": 60,
        "puntos": 0,
        "defendiendo": false,
        "sobrecargado": false
      },
      "p2": {
        "id": "p2",
        "nombre": "Monita",
        "posicion": { "x": 20, "y": 1 },
        "vida": 100,
        "energia": 60,
        "puntos": 0,
        "defendiendo": false,
        "sobrecargado": false
      }
    },
    "arboles": [
      { "id": 1, "tipo": "palmera", "posicion": { "x": 1, "y": 3 } },
      { "id": 2, "tipo": "ceiba", "posicion": { "x": 5, "y": 3 } }
    ],
    "recursos": [
      { "id": 1, "tipo": "pizza", "posicion": { "x": 14, "y": 10 } },
      { "id": 2, "tipo": "pollo", "posicion": { "x": 7, "y": 6 } }
    ],
    "fuego": { "centro": { "x": 7, "y": 4 }, "radio": 1, "crecimiento": 1 },
    "eventos": [
      {
        "id": 1,
        "tipo": "info",
        "texto": "La jungla se incendia. Come todo lo que puedas y esquiva el fuego."
      }
    ],
    "columnas": 22,
    "filas": 11
  }
}
```

> Cada arbol tiene `id` y `tipo` (`ceiba`, `palmera` o `arbusto`) porque los arboles cambian durante
> la partida: el `id` permite a React saber cual es nuevo y animarlo al aparecer.
>
> La respuesta real incluye ademas algunos campos internos del servidor (`terminaEn`, `relojEnergia`,
> `relojArboles`, `relojFuego`, `relojDanioFuego`, `relojRadioFuego`, `relojRecursos`, `escudoHasta`,
> `sobrecargaHasta`, `ultimaAccion`, `ultimoIdEvento`, `ultimoIdRecurso`, `ultimoIdArbol`). Son las marcas de tiempo
> que usa la logica del juego; el frontend no las necesita porque el servidor ya le entrega
> `defendiendo`, `sobrecargado` y `tiempoRestanteMs` calculados.

## GET /api/game/:id

Devuelve el estado actual. Antes de responder, el servidor **avanza la partida** hasta el momento
actual: regenera energia, cambia arboles de sitio, mueve el incendio, lo hace crecer o apagarse,
aplica las quemaduras, genera comida nueva, recalcula el tiempo restante y comprueba si la partida
termino. El frontend llama a este
endpoint cada 500 ms.

**Solicitud**

```http
GET /api/game/g5opcz
```

**Respuesta 200**: mismo formato que `POST /api/game`, con los valores ya actualizados.

**Respuesta 404**

```json
{
  "error": {
    "codigo": "PARTIDA_NO_ENCONTRADA",
    "mensaje": "No existe una partida con ese identificador."
  }
}
```

## POST /api/game/:id/action

Envia una accion de un jugador. El servidor la valida y, si es correcta, la aplica y devuelve el nuevo
estado.

**Cuerpo de la solicitud**

```jsonc
{
  "jugador": "p1",          // "p1" | "p2"
  "tipo": "mover",          // "mover" | "atacar" | "defender"
  "direccion": "arriba"     // solo para "mover": "arriba" | "abajo" | "izquierda" | "derecha"
}
```

**Ejemplo: movimiento valido**

```http
POST /api/game/g5opcz/action
Content-Type: application/json

{ "jugador": "p1", "tipo": "mover", "direccion": "arriba" }
```

Respuesta 200 (fragmento):

```json
{
  "partida": {
    "jugadores": {
      "p1": { "posicion": { "x": 1, "y": 8 }, "vida": 100, "energia": 64, "puntos": 15 }
    },
    "eventos": [
      { "id": 2, "tipo": "recurso", "texto": "Monito se comio una pizza (+15 puntos)." }
    ]
  }
}
```

**Ejemplo: golpe valido**

```http
POST /api/game/g5opcz/action
Content-Type: application/json

{ "jugador": "p2", "tipo": "atacar" }
```

```json
{
  "partida": {
    "jugadores": {
      "p1": { "vida": 85 },
      "p2": { "energia": 39, "puntos": 8 }
    },
    "eventos": [
      { "id": 7, "tipo": "ataque", "texto": "Monita golpeo a Monito: -15 de vida. +8 puntos." }
    ]
  }
}
```

**Ejemplo: accion invalida (golpe fuera de alcance)**

```http
POST /api/game/g5opcz/action
Content-Type: application/json

{ "jugador": "p1", "tipo": "atacar" }
```

Respuesta **400**:

```json
{
  "error": {
    "codigo": "FUERA_DE_ALCANCE",
    "mensaje": "Monita esta demasiado lejos (distancia 27, alcance 2)."
  },
  "partida": {
    "eventos": [
      {
        "id": 3,
        "tipo": "error",
        "texto": "Monita esta demasiado lejos (distancia 27, alcance 2)."
      }
    ]
  }
}
```

Codigos de error posibles: `FUERA_DEL_TABLERO`, `CASILLA_BLOQUEADA`, `CASILLA_OCUPADA`, `SIN_ENERGIA`,
`FUERA_DE_ALCANCE`, `EN_ENFRIAMIENTO`, `PARTIDA_TERMINADA`, `ACCION_INVALIDA` (400) y
`PARTIDA_NO_ENCONTRADA` (404). Estan explicados en [reglas.md](reglas.md).

## POST /api/game/:id/finish

Termina la partida antes de que se acabe el tiempo (boton *Terminar partida*). Gana el mono que tenga
mas puntos en ese momento.

```json
{
  "partida": {
    "estado": "terminada",
    "ganador": "p1",
    "motivoFin": "abandono",
    "tiempoRestanteMs": 0
  }
}
```

## GET /api/salud

Comprobacion de que el servicio esta encendido. La usan el *health check* de Render y Playwright
antes de empezar las pruebas.

```json
{ "estado": "ok", "partidasEnMemoria": 2 }
```

## Almacenamiento

Las partidas se guardan en un `Map` en memoria mientras el servidor esta encendido. No hay base de
datos porque una partida dura 90 segundos y no se necesita historial. Para que la memoria no crezca
sin control, el servidor conserva como maximo 50 partidas y descarta la mas antigua al pasarse.

## Prueba rapida desde la terminal

```bash
# crear partida
curl -X POST http://localhost:3001/api/game -H "Content-Type: application/json" -d "{}"

# consultar estado (reemplazar el id)
curl http://localhost:3001/api/game/g5opcz

# mover a Monito
curl -X POST http://localhost:3001/api/game/g5opcz/action \
  -H "Content-Type: application/json" \
  -d "{\"jugador\":\"p1\",\"tipo\":\"mover\",\"direccion\":\"arriba\"}"
```
