# Reglas de Monitos en Fuga

Todas las constantes de este documento estan juntas al inicio de
[`backend/src/juego.ts`](../backend/src/juego.ts), asi que cualquier ajuste se hace en un solo lugar.

## Inicio de la partida

- La jungla es una cuadricula de **22 columnas x 11 filas**.
- **Monito** empieza abajo a la izquierda `(1, 9)` y **Monita** arriba a la derecha `(20, 1)`.
- Cada mono empieza con **100 de vida**, **60 de energia** y **0 puntos**.
- El servidor coloca **14 arboles** de especies aleatorias (ceiba, palmera o arbusto) en posiciones
  aleatorias (nunca a menos de 2 casillas de una posicion inicial) y **4 comidas** iniciales.
- El incendio aparece en una posicion aleatoria cercana al centro, con su tamano minimo.
- La partida dura **90 segundos**.

## Acciones validas

| Accion | Teclas | Costo | Efecto |
|--------|--------|-------|--------|
| Mover | `W A S D` / flechas | 0 | Avanza una casilla; si hay comida, se la come |
| Golpear | `F` / `L` | 25 de energia | 15 de dano al otro mono si esta a 2 casillas o menos, +8 puntos |
| Cubrirse con hojas | `G` / `K` | 15 de energia | Durante 3 segundos recibe 60% menos dano |

- Golpear y cubrirse tienen un **enfriamiento de 0.6 segundos** por jugador.
- El movimiento no tiene enfriamiento: cada peticion mueve exactamente una casilla, y mientras la
  tecla siga presionada el frontend envia una peticion cada 130 ms.

## Acciones invalidas

El servidor las rechaza con HTTP 400, un codigo de error y un mensaje que aparece como aviso sobre la
jungla durante unos segundos (nunca solo en la consola):

| Codigo | Cuando ocurre |
|--------|----------------|
| `FUERA_DEL_TABLERO` | El mono intenta salir de la jungla |
| `CASILLA_BLOQUEADA` | Intenta atravesar un arbol |
| `CASILLA_OCUPADA` | Intenta entrar en la casilla del otro mono, que le bloquea el paso |
| `SIN_ENERGIA` | Golpea o se cubre sin la energia necesaria |
| `FUERA_DE_ALCANCE` | Golpea cuando el otro mono esta a mas de 2 casillas |
| `EN_ENFRIAMIENTO` | Golpea o se cubre antes de que pase el enfriamiento |
| `PARTIDA_TERMINADA` | Envia cualquier accion despues del final |
| `ACCION_INVALIDA` | El cuerpo JSON no tiene un jugador, un tipo o una direccion validos |
| `PARTIDA_NO_ENCONTRADA` | El identificador de la partida no existe (HTTP 404) |

## Comida

Aparece una comida nueva cada **2.5 segundos** hasta un maximo de **8** en la jungla, siempre en una
casilla libre elegida al azar.

| Comida | Probabilidad | Efecto |
|--------|--------------|--------|
| Pizza | 60% | +15 puntos |
| Pollo frito | 25% | +35 de energia (maximo 100) |
| Sushi | 15% | Golpe doble durante 6 segundos: 30 de dano y cuesta 13 de energia |

## La jungla cambia: arboles que brotan y desaparecen

Los arboles no son fijos. **Cada 2 segundos** el servidor quita un arbol al azar y hace brotar otro
de una especie al azar (ceiba, palmera o arbusto) en una casilla libre elegida al azar:

- siempre hay como maximo **14 arboles**;
- nunca brota un arbol encima de un mono, de una comida o de otro arbol;
- nunca brota **pegado a un mono** (a 1 casilla o menos), para no encerrarlo de golpe;
- en pantalla el arbol nuevo aparece con una pequena animacion de crecimiento.

Asi un camino que estaba libre puede cerrarse y otro puede abrirse en mitad de la partida.

## El incendio

Es la amenaza que da nombre al juego y el elemento mas peligroso del tablero:

- **Se desplaza** una casilla en una direccion aleatoria **cada 0.8 segundos**, sin salirse de la
  jungla.
- **Crece y se apaga**: cada 3 segundos su radio cambia un paso. Empieza en 3x3 casillas, crece hasta
  7x7 y despues vuelve a encogerse, una y otra vez. El estado guarda si esta creciendo o apagandose
  en el campo `crecimiento` (`1` o `-1`).
- **Quema 5 de vida por segundo** a cualquier mono que este dentro.
- Cuando cambia de tamano, el servidor recoloca su centro para que el area siga cabiendo dentro del
  tablero.

Esto obliga a mirar el fuego constantemente: una casilla que era segura deja de serlo cuando el
incendio se expande, y una comida que parecia inalcanzable queda libre cuando se apaga.

## Paso del tiempo

Cada mono recupera **4 de energia por segundo** (maximo 100). El servidor aplica esto, el movimiento
del fuego, su crecimiento, su dano y la aparicion de comida cada vez que recibe una peticion, usando
marcas de tiempo; por eso el resultado no depende de la frecuencia con la que el frontend pregunte.

## Condicion de victoria, derrota y empate

| Situacion | Motivo | Resultado |
|-----------|--------|-----------|
| Un mono llega a 0 de vida | `ko` | Gana el otro mono |
| Los dos llegan a 0 a la vez | `ko` | Empate |
| Se acaban los 90 segundos | `tiempo` | Gana quien tenga mas puntos; si hay igualdad, empate |
| Se pulsa *Terminar partida* | `abandono` | Gana quien tenga mas puntos; si hay igualdad, empate |

Cuando la partida termina, el estado pasa a `terminada`, se muestra la pantalla de resultado y el
servidor rechaza cualquier accion posterior.

## Estados que maneja el juego

El examen pide al menos tres tipos de estado; este juego relaciona nueve:

| Estado | Donde vive | Para que sirve |
|--------|-----------|----------------|
| Posicion (x, y) | Cada mono | Movimiento, alcance del golpe, comer, dano del fuego |
| Vida | Cada mono | Condicion de KO |
| Energia | Cada mono | Limita golpear y cubrirse; se regenera con el tiempo y con el pollo |
| Puntos | Cada mono | Condicion de victoria por tiempo |
| Efectos temporales | Cada mono | Hojas (3 s) y golpe doble del sushi (6 s) |
| Tiempo restante | Partida | Cuenta atras y final por tiempo |
| Comida y arboles | Partida | Mapa que cambia durante la partida (comida nueva y arboles que brotan y desaparecen) |
| Incendio | Partida | Area movil que ademas cambia de tamano |
| Eventos | Partida | Mensajes visibles de lo que va ocurriendo |

## Interaccion entre los dos jugadores

Los dos monos comparten un unico estado en el servidor, asi que se afectan de varias formas:

1. **Golpes:** quitar vida al otro mono es la unica forma de ganar antes de que acabe el tiempo.
2. **Hojas:** cubrirse cambia el resultado del golpe del rival (15 de dano pasan a 6).
3. **Competencia por la comida:** solo hay unas pocas comidas en la jungla; el que llega primero se la
   come y el otro se queda sin ella.
4. **Bloqueo:** un mono no puede atravesar la casilla del otro, asi que puede cortarle el camino hacia
   una pizza o dejarlo atrapado contra el incendio.
5. **Puntos por golpe:** golpear no solo quita vida, tambien suma puntos, asi que la pelea compite con
   la recoleccion como estrategia.

## Elementos que se mueven

- Los **dos monos**, que cambian de casilla con cada accion de movimiento.
- El **incendio**, que se desplaza cada 0.8 segundos y ademas crece y se achica.
- Los **arboles**, que cada 2 segundos desaparecen de un sitio y brotan en otro con otra forma.
- La **comida**, que aparece cada 2.5 segundos y desaparece al ser comida.
- Las **barras de vida y energia** y el **temporizador**, que cambian continuamente en pantalla.

## Variabilidad entre partidas

Ninguna partida es igual a otra porque en cada una cambian:

- la posicion y la especie de los 14 arboles, y hacia donde van brotando durante la partida;
- la posicion inicial del incendio y la direccion en la que se mueve;
- el momento en que el fuego crece o se apaga respecto a donde estan los monos;
- el tipo y la posicion de la comida que va apareciendo.

## Estrategia

No basta con pulsar una tecla repetidamente:

- golpear sin controlar la energia deja al mono indefenso, porque tampoco podra cubrirse;
- perseguir al rival puede costar pizzas que el otro aprovecha;
- entrar en el incendio por una pizza puede costar 10 o 15 de vida;
- el sushi es la recompensa mas arriesgada (golpe doble) y suele estar lejos;
- cuando el fuego esta en su punto maximo conviene jugar por los bordes, y cuando se apaga se puede
  volver al centro a por la comida acumulada.
