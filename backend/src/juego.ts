/**
 * Logica del juego Monitos en Fuga.
 *
 * Todo lo importante de la partida ocurre aqui, en el servidor:
 * crear la partida, mover, atacar, defender, comer, mover el fuego,
 * aplicar quemaduras y decidir el ganador.
 * El frontend solo dibuja el estado que devuelve este modulo.
 */

import {
  Accion,
  Arbol,
  Direccion,
  Evento,
  Ganador,
  IdJugador,
  Jugador,
  Partida,
  Posicion,
  Recurso,
  ResultadoAccion,
  TipoArbol,
  TipoEvento,
  TipoRecurso
} from './types';

// ---------------------------------------------------------------------------
// Reglas del juego (constantes juntas para poder ajustarlas rapido)
// ---------------------------------------------------------------------------

export const COLUMNAS = 22;
export const FILAS = 11;

export const DURACION_PARTIDA_MS = 90_000;

const VIDA_INICIAL = 100;
const ENERGIA_INICIAL = 60;
const ENERGIA_MAXIMA = 100;
const ENERGIA_POR_SEGUNDO = 4;

const COSTO_ATAQUE = 25;
const DANO_ATAQUE = 15;
const ALCANCE_ATAQUE = 2; // distancia Manhattan
const PUNTOS_POR_GOLPE = 8;

const COSTO_DEFENSA = 15;
const DURACION_ESCUDO_MS = 3_000;
const REDUCCION_ESCUDO = 0.6; // el escudo absorbe el 60% del dano

const DURACION_SOBRECARGA_MS = 6_000;
const ENFRIAMIENTO_ACCION_MS = 600; // atacar y defender

const CANTIDAD_ARBOLES = 14;
const INTERVALO_ARBOLES_MS = 2_000; // cada cuanto la jungla cambia un arbol de sitio
const MAXIMO_RECURSOS = 8;
const INTERVALO_RECURSO_MS = 2_500;
const PUNTOS_PIZZA = 15;
const ENERGIA_POLLO = 35;

const INTERVALO_FUEGO_MS = 800; // cada cuanto se desplaza el incendio
const INTERVALO_RADIO_FUEGO_MS = 3_000; // cada cuanto crece o se apaga
const RADIO_MINIMO_FUEGO = 1; // 3x3 casillas
const RADIO_MAXIMO_FUEGO = 3; // 7x7 casillas
const DANO_FUEGO = 5; // dano por segundo dentro del fuego

const MAXIMO_EVENTOS = 8;

// ---------------------------------------------------------------------------
// Utilidades pequenas
// ---------------------------------------------------------------------------

function enteroAleatorio(minimo: number, maximo: number): number {
  return minimo + Math.floor(Math.random() * (maximo - minimo + 1));
}

function mismaPosicion(a: Posicion, b: Posicion): boolean {
  return a.x === b.x && a.y === b.y;
}

function distanciaManhattan(a: Posicion, b: Posicion): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function listaJugadores(partida: Partida): Jugador[] {
  return [partida.jugadores.p1, partida.jugadores.p2];
}

function rival(id: IdJugador): IdJugador {
  return id === 'p1' ? 'p2' : 'p1';
}

function agregarEvento(partida: Partida, tipo: TipoEvento, texto: string): void {
  partida.ultimoIdEvento += 1;
  const evento: Evento = { id: partida.ultimoIdEvento, tipo, texto };
  partida.eventos.push(evento);
  if (partida.eventos.length > MAXIMO_EVENTOS) {
    partida.eventos.shift();
  }
}

// ---------------------------------------------------------------------------
// Creacion de la partida
// ---------------------------------------------------------------------------

function crearJugador(id: IdJugador, nombre: string, posicion: Posicion): Jugador {
  return {
    id,
    nombre,
    posicion,
    vida: VIDA_INICIAL,
    energia: ENERGIA_INICIAL,
    puntos: 0,
    defendiendo: false,
    sobrecargado: false,
    escudoHasta: 0,
    sobrecargaHasta: 0,
    ultimaAccion: 0
  };
}

function sortearTipoArbol(): TipoArbol {
  const tipos: TipoArbol[] = ['ceiba', 'palmera', 'arbusto'];
  return tipos[enteroAleatorio(0, tipos.length - 1)];
}

/**
 * Los arboles cambian en cada partida (variabilidad). No se colocan cerca de
 * las posiciones iniciales para que ningun mono empiece encerrado.
 */
function generarArboles(inicioP1: Posicion, inicioP2: Posicion): Arbol[] {
  const arboles: Arbol[] = [];
  let intentos = 0;

  while (arboles.length < CANTIDAD_ARBOLES && intentos < 300) {
    intentos += 1;
    const candidato: Posicion = {
      x: enteroAleatorio(1, COLUMNAS - 2),
      y: enteroAleatorio(1, FILAS - 2)
    };

    const cercaDeUnInicio =
      distanciaManhattan(candidato, inicioP1) <= 2 || distanciaManhattan(candidato, inicioP2) <= 2;
    const repetido = arboles.some((arbol) => mismaPosicion(arbol.posicion, candidato));

    if (!cercaDeUnInicio && !repetido) {
      arboles.push({ id: arboles.length + 1, tipo: sortearTipoArbol(), posicion: candidato });
    }
  }

  return arboles;
}

function sortearTipoRecurso(): TipoRecurso {
  const sorteo = Math.random();
  if (sorteo < 0.6) return 'pizza';
  if (sorteo < 0.85) return 'pollo';
  return 'sushi';
}

function casillaLibre(partida: Partida, posicion: Posicion): boolean {
  const hayArbol = partida.arboles.some((arbol) => mismaPosicion(arbol.posicion, posicion));
  const hayRecurso = partida.recursos.some((recurso) => mismaPosicion(recurso.posicion, posicion));
  const hayJugador = listaJugadores(partida).some((jugador) => mismaPosicion(jugador.posicion, posicion));
  return !hayArbol && !hayRecurso && !hayJugador;
}

/** Coloca una comida nueva en una casilla libre elegida al azar. */
function generarRecurso(partida: Partida): void {
  for (let intento = 0; intento < 40; intento += 1) {
    const posicion: Posicion = {
      x: enteroAleatorio(0, COLUMNAS - 1),
      y: enteroAleatorio(0, FILAS - 1)
    };

    if (casillaLibre(partida, posicion)) {
      partida.ultimoIdRecurso += 1;
      const recurso: Recurso = {
        id: partida.ultimoIdRecurso,
        tipo: sortearTipoRecurso(),
        posicion
      };
      partida.recursos.push(recurso);
      return;
    }
  }
}

/**
 * Planta un arbol nuevo, de una especie al azar, en una casilla libre.
 * No se planta al lado de un mono para no encerrarlo de golpe.
 */
function plantarArbol(partida: Partida): void {
  for (let intento = 0; intento < 40; intento += 1) {
    const posicion: Posicion = {
      x: enteroAleatorio(0, COLUMNAS - 1),
      y: enteroAleatorio(0, FILAS - 1)
    };

    const pegadoAUnMono = listaJugadores(partida).some(
      (jugador) => distanciaManhattan(jugador.posicion, posicion) <= 1
    );

    if (casillaLibre(partida, posicion) && !pegadoAUnMono) {
      partida.ultimoIdArbol += 1;
      partida.arboles.push({
        id: partida.ultimoIdArbol,
        tipo: sortearTipoArbol(),
        posicion
      });
      return;
    }
  }
}

/**
 * La jungla se mueve: cada cierto tiempo un arbol desaparece y brota otro en
 * otro sitio, con otra forma. Asi el mapa nunca es el mismo dos veces.
 */
function renovarArboles(partida: Partida): void {
  if (partida.arboles.length >= CANTIDAD_ARBOLES) {
    const indice = enteroAleatorio(0, partida.arboles.length - 1);
    partida.arboles.splice(indice, 1);
  }
  plantarArbol(partida);
}

export function crearPartida(id: string, ahora: number): Partida {
  const inicioP1: Posicion = { x: 1, y: FILAS - 2 };
  const inicioP2: Posicion = { x: COLUMNAS - 2, y: 1 };

  const partida: Partida = {
    id,
    estado: 'en_curso',
    ganador: null,
    motivoFin: null,
    tiempoRestanteMs: DURACION_PARTIDA_MS,
    jugadores: {
      p1: crearJugador('p1', 'Monito', inicioP1),
      p2: crearJugador('p2', 'Monita', inicioP2)
    },
    arboles: generarArboles(inicioP1, inicioP2),
    recursos: [],
    fuego: {
      centro: { x: enteroAleatorio(4, COLUMNAS - 5), y: enteroAleatorio(3, FILAS - 4) },
      radio: RADIO_MINIMO_FUEGO,
      crecimiento: 1
    },
    eventos: [],
    columnas: COLUMNAS,
    filas: FILAS,
    terminaEn: ahora + DURACION_PARTIDA_MS,
    relojEnergia: ahora,
    relojArboles: ahora,
    relojFuego: ahora,
    relojDanioFuego: ahora,
    relojRadioFuego: ahora,
    relojRecursos: ahora,
    ultimoIdEvento: 0,
    ultimoIdRecurso: 0,
    ultimoIdArbol: CANTIDAD_ARBOLES
  };

  for (let i = 0; i < 4; i += 1) {
    generarRecurso(partida);
  }

  agregarEvento(partida, 'info', 'La jungla se incendia. Come todo lo que puedas y esquiva el fuego.');
  return partida;
}

// ---------------------------------------------------------------------------
// Avance del tiempo (se ejecuta antes de responder cualquier peticion)
// ---------------------------------------------------------------------------

function dentroDelFuego(partida: Partida, posicion: Posicion): boolean {
  const { centro, radio } = partida.fuego;
  return Math.abs(posicion.x - centro.x) <= radio && Math.abs(posicion.y - centro.y) <= radio;
}

/** Mantiene el fuego dentro del tablero segun el radio que tenga en ese momento. */
function acomodarFuego(partida: Partida): void {
  const { centro, radio } = partida.fuego;
  partida.fuego.centro = {
    x: Math.min(Math.max(centro.x, radio), COLUMNAS - 1 - radio),
    y: Math.min(Math.max(centro.y, radio), FILAS - 1 - radio)
  };
}

function moverFuego(partida: Partida): void {
  const desplazamientos: Posicion[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];
  const paso = desplazamientos[enteroAleatorio(0, desplazamientos.length - 1)];
  const { centro } = partida.fuego;

  partida.fuego.centro = { x: centro.x + paso.x, y: centro.y + paso.y };
  acomodarFuego(partida);
}

/**
 * El incendio "respira": crece hasta el radio maximo y despues se va apagando
 * hasta el minimo, una y otra vez.
 */
function cambiarTamanoFuego(partida: Partida): void {
  const fuego = partida.fuego;
  fuego.radio += fuego.crecimiento;

  if (fuego.radio >= RADIO_MAXIMO_FUEGO) {
    fuego.radio = RADIO_MAXIMO_FUEGO;
    fuego.crecimiento = -1;
    agregarEvento(partida, 'fuego', 'El incendio esta en su punto mas alto.');
  } else if (fuego.radio <= RADIO_MINIMO_FUEGO) {
    fuego.radio = RADIO_MINIMO_FUEGO;
    fuego.crecimiento = 1;
    agregarEvento(partida, 'fuego', 'El fuego se calma... por ahora.');
  }

  acomodarFuego(partida);
}

function actualizarEstadosDerivados(partida: Partida, ahora: number): void {
  for (const jugador of listaJugadores(partida)) {
    jugador.defendiendo = jugador.escudoHasta > ahora;
    jugador.sobrecargado = jugador.sobrecargaHasta > ahora;
    jugador.vida = Math.max(0, jugador.vida);
    jugador.energia = Math.min(ENERGIA_MAXIMA, Math.max(0, jugador.energia));
  }
  partida.tiempoRestanteMs = Math.max(0, partida.terminaEn - ahora);
}

/** Cuando no hubo KO, gana quien tenga mas puntos; si empatan, es empate. */
function ganadorPorPuntos(partida: Partida): Ganador {
  const { p1, p2 } = partida.jugadores;
  if (p1.puntos === p2.puntos) return 'empate';
  return p1.puntos > p2.puntos ? 'p1' : 'p2';
}

function anunciarFinal(partida: Partida): void {
  const texto =
    partida.ganador === 'empate'
      ? 'La partida termino en empate.'
      : `Gano ${partida.jugadores[partida.ganador as IdJugador].nombre}.`;
  agregarEvento(partida, 'fin', texto);
}

/** Final normal: por KO (alguien llego a 0 de vida) o porque se acabo el tiempo. */
function terminarPartida(partida: Partida): void {
  const { p1, p2 } = partida.jugadores;
  partida.estado = 'terminada';

  if (p1.vida <= 0 || p2.vida <= 0) {
    partida.motivoFin = 'ko';
    if (p1.vida <= 0 && p2.vida <= 0) {
      partida.ganador = 'empate';
    } else {
      partida.ganador = p1.vida <= 0 ? 'p2' : 'p1';
    }
  } else {
    partida.motivoFin = 'tiempo';
    partida.ganador = ganadorPorPuntos(partida);
  }

  anunciarFinal(partida);
}

/**
 * Final anticipado: los jugadores deciden terminar la partida desde la
 * interfaz. Gana quien tenga mas puntos en ese momento.
 */
export function terminarPorAbandono(partida: Partida, ahora: number): void {
  avanzarPartida(partida, ahora);
  if (partida.estado === 'terminada') return;

  partida.estado = 'terminada';
  partida.motivoFin = 'abandono';
  partida.ganador = ganadorPorPuntos(partida);
  agregarEvento(partida, 'info', 'Los monos escaparon de la jungla antes de tiempo.');
  anunciarFinal(partida);
}

function revisarFinal(partida: Partida): void {
  if (partida.estado === 'terminada') return;

  const sinVida = listaJugadores(partida).some((jugador) => jugador.vida <= 0);
  if (sinVida || partida.tiempoRestanteMs <= 0) {
    terminarPartida(partida);
  }
}

/**
 * Avanza la partida hasta el momento "ahora": regenera energia, mueve el
 * fuego, lo hace crecer o apagarse, aplica quemaduras, genera comida y revisa
 * si la partida termino. Se usan relojes con marcas de tiempo para que el
 * resultado no dependa de cada cuanto pregunte el frontend.
 */
export function avanzarPartida(partida: Partida, ahora: number): void {
  if (partida.estado === 'terminada') {
    actualizarEstadosDerivados(partida, ahora);
    partida.tiempoRestanteMs = 0;
    return;
  }

  while (ahora - partida.relojEnergia >= 1_000) {
    partida.relojEnergia += 1_000;
    for (const jugador of listaJugadores(partida)) {
      jugador.energia = Math.min(ENERGIA_MAXIMA, jugador.energia + ENERGIA_POR_SEGUNDO);
    }
  }

  while (ahora - partida.relojArboles >= INTERVALO_ARBOLES_MS) {
    partida.relojArboles += INTERVALO_ARBOLES_MS;
    renovarArboles(partida);
  }

  while (ahora - partida.relojFuego >= INTERVALO_FUEGO_MS) {
    partida.relojFuego += INTERVALO_FUEGO_MS;
    moverFuego(partida);
  }

  while (ahora - partida.relojRadioFuego >= INTERVALO_RADIO_FUEGO_MS) {
    partida.relojRadioFuego += INTERVALO_RADIO_FUEGO_MS;
    cambiarTamanoFuego(partida);
  }

  while (ahora - partida.relojDanioFuego >= 1_000) {
    partida.relojDanioFuego += 1_000;
    for (const jugador of listaJugadores(partida)) {
      if (jugador.vida > 0 && dentroDelFuego(partida, jugador.posicion)) {
        jugador.vida -= DANO_FUEGO;
        agregarEvento(partida, 'fuego', `${jugador.nombre} se esta quemando: -${DANO_FUEGO} de vida.`);
      }
    }
  }

  while (ahora - partida.relojRecursos >= INTERVALO_RECURSO_MS) {
    partida.relojRecursos += INTERVALO_RECURSO_MS;
    if (partida.recursos.length < MAXIMO_RECURSOS) {
      generarRecurso(partida);
    }
  }

  actualizarEstadosDerivados(partida, ahora);
  revisarFinal(partida);
}

// ---------------------------------------------------------------------------
// Acciones de los jugadores
// ---------------------------------------------------------------------------

function calcularDestino(posicion: Posicion, direccion: Direccion): Posicion {
  switch (direccion) {
    case 'arriba':
      return { x: posicion.x, y: posicion.y - 1 };
    case 'abajo':
      return { x: posicion.x, y: posicion.y + 1 };
    case 'izquierda':
      return { x: posicion.x - 1, y: posicion.y };
    case 'derecha':
      return { x: posicion.x + 1, y: posicion.y };
  }
}

/** Si el mono queda sobre una comida, se la come y la comida desaparece. */
function recogerRecurso(partida: Partida, jugador: Jugador, ahora: number): void {
  const indice = partida.recursos.findIndex((recurso) =>
    mismaPosicion(recurso.posicion, jugador.posicion)
  );
  if (indice === -1) return;

  const recurso = partida.recursos[indice];
  partida.recursos.splice(indice, 1);

  if (recurso.tipo === 'pizza') {
    jugador.puntos += PUNTOS_PIZZA;
    agregarEvento(partida, 'recurso', `${jugador.nombre} se comio una pizza (+${PUNTOS_PIZZA} puntos).`);
  } else if (recurso.tipo === 'pollo') {
    jugador.energia = Math.min(ENERGIA_MAXIMA, jugador.energia + ENERGIA_POLLO);
    agregarEvento(
      partida,
      'recurso',
      `${jugador.nombre} se comio un pollo frito (+${ENERGIA_POLLO} de energia).`
    );
  } else {
    jugador.sobrecargaHasta = ahora + DURACION_SOBRECARGA_MS;
    agregarEvento(partida, 'recurso', `${jugador.nombre} se comio un sushi: golpe doble por 6 segundos.`);
  }
}

function mover(partida: Partida, jugador: Jugador, direccion: Direccion, ahora: number): ResultadoAccion {
  const destino = calcularDestino(jugador.posicion, direccion);

  if (destino.x < 0 || destino.x >= COLUMNAS || destino.y < 0 || destino.y >= FILAS) {
    return {
      ok: false,
      codigo: 'FUERA_DEL_TABLERO',
      mensaje: `${jugador.nombre} choco con el limite de la jungla.`
    };
  }

  if (partida.arboles.some((arbol) => mismaPosicion(arbol.posicion, destino))) {
    return { ok: false, codigo: 'CASILLA_BLOQUEADA', mensaje: `${jugador.nombre} choco contra un arbol.` };
  }

  const otro = partida.jugadores[rival(jugador.id)];
  if (mismaPosicion(otro.posicion, destino)) {
    return {
      ok: false,
      codigo: 'CASILLA_OCUPADA',
      mensaje: `${otro.nombre} le bloquea el paso a ${jugador.nombre}.`
    };
  }

  jugador.posicion = destino;
  recogerRecurso(partida, jugador, ahora);
  return { ok: true };
}

function atacar(partida: Partida, jugador: Jugador, ahora: number): ResultadoAccion {
  if (ahora - jugador.ultimaAccion < ENFRIAMIENTO_ACCION_MS) {
    return { ok: false, codigo: 'EN_ENFRIAMIENTO', mensaje: `${jugador.nombre} todavia se esta recuperando.` };
  }

  const costo = jugador.sobrecargado ? Math.round(COSTO_ATAQUE / 2) : COSTO_ATAQUE;
  if (jugador.energia < costo) {
    return {
      ok: false,
      codigo: 'SIN_ENERGIA',
      mensaje: `${jugador.nombre} no tiene energia suficiente para atacar (necesita ${costo}).`
    };
  }

  const objetivo = partida.jugadores[rival(jugador.id)];
  const distancia = distanciaManhattan(jugador.posicion, objetivo.posicion);
  if (distancia > ALCANCE_ATAQUE) {
    return {
      ok: false,
      codigo: 'FUERA_DE_ALCANCE',
      mensaje: `${objetivo.nombre} esta demasiado lejos (distancia ${distancia}, alcance ${ALCANCE_ATAQUE}).`
    };
  }

  jugador.energia -= costo;
  jugador.ultimaAccion = ahora;

  let dano = jugador.sobrecargado ? DANO_ATAQUE * 2 : DANO_ATAQUE;
  let textoEscudo = '';
  if (objetivo.defendiendo) {
    dano = Math.round(dano * (1 - REDUCCION_ESCUDO));
    textoEscudo = ' (las hojas absorbieron parte del golpe)';
  }

  objetivo.vida -= dano;
  jugador.puntos += PUNTOS_POR_GOLPE;
  agregarEvento(
    partida,
    'ataque',
    `${jugador.nombre} golpeo a ${objetivo.nombre}: -${dano} de vida${textoEscudo}. +${PUNTOS_POR_GOLPE} puntos.`
  );

  return { ok: true };
}

function defender(partida: Partida, jugador: Jugador, ahora: number): ResultadoAccion {
  if (ahora - jugador.ultimaAccion < ENFRIAMIENTO_ACCION_MS) {
    return { ok: false, codigo: 'EN_ENFRIAMIENTO', mensaje: `${jugador.nombre} todavia se esta recuperando.` };
  }

  if (jugador.energia < COSTO_DEFENSA) {
    return {
      ok: false,
      codigo: 'SIN_ENERGIA',
      mensaje: `${jugador.nombre} no tiene energia para cubrirse (necesita ${COSTO_DEFENSA}).`
    };
  }

  jugador.energia -= COSTO_DEFENSA;
  jugador.ultimaAccion = ahora;
  jugador.escudoHasta = ahora + DURACION_ESCUDO_MS;
  jugador.defendiendo = true;
  agregarEvento(partida, 'info', `${jugador.nombre} se cubrio con hojas por 3 segundos.`);

  return { ok: true };
}

/**
 * Valida y aplica una accion. Devuelve el motivo cuando la accion es invalida
 * y ademas lo registra como evento para que se vea en la pantalla del juego.
 */
export function aplicarAccion(partida: Partida, accion: Accion, ahora: number): ResultadoAccion {
  if (partida.estado === 'terminada') {
    const resultado: ResultadoAccion = {
      ok: false,
      codigo: 'PARTIDA_TERMINADA',
      mensaje: 'La partida ya termino: no se aceptan mas acciones.'
    };
    agregarEvento(partida, 'error', resultado.mensaje);
    return resultado;
  }

  const jugador = partida.jugadores[accion.jugador];
  let resultado: ResultadoAccion;

  if (accion.tipo === 'mover') {
    if (!accion.direccion) {
      resultado = { ok: false, codigo: 'ACCION_INVALIDA', mensaje: 'Falta la direccion del movimiento.' };
    } else {
      resultado = mover(partida, jugador, accion.direccion, ahora);
    }
  } else if (accion.tipo === 'atacar') {
    resultado = atacar(partida, jugador, ahora);
  } else {
    resultado = defender(partida, jugador, ahora);
  }

  if (!resultado.ok) {
    agregarEvento(partida, 'error', resultado.mensaje);
  }

  actualizarEstadosDerivados(partida, ahora);
  revisarFinal(partida);
  return resultado;
}
