/**
 * Tipos compartidos del juego Monitos en Fuga.
 * El frontend tiene una copia equivalente en frontend/src/types/juego.ts
 * para que ambos lados hablen del mismo estado.
 */

export type IdJugador = 'p1' | 'p2';

/** Comidas que aparecen en la jungla. */
export type TipoRecurso = 'pizza' | 'pollo' | 'sushi';

export type EstadoPartida = 'en_curso' | 'terminada';

export type MotivoFin = 'ko' | 'tiempo' | 'abandono';

export type Ganador = IdJugador | 'empate';

export type TipoAccion = 'mover' | 'atacar' | 'defender';

export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

export type TipoEvento = 'info' | 'ataque' | 'recurso' | 'fuego' | 'error' | 'fin';

export interface Posicion {
  x: number;
  y: number;
}

export interface Jugador {
  id: IdJugador;
  nombre: string;
  posicion: Posicion;
  vida: number;
  energia: number;
  puntos: number;
  /** true mientras el escudo esta activo (se recalcula en cada tick). */
  defendiendo: boolean;
  /** true mientras dura el efecto del sushi (ataque potenciado). */
  sobrecargado: boolean;
  /** Momentos usados por el servidor para los enfriamientos y efectos. */
  escudoHasta: number;
  sobrecargaHasta: number;
  ultimaAccion: number;
}

export interface Recurso {
  id: number;
  tipo: TipoRecurso;
  posicion: Posicion;
}

/** Los arboles bloquean el paso y van cambiando durante la partida. */
export type TipoArbol = 'ceiba' | 'palmera' | 'arbusto';

export interface Arbol {
  id: number;
  tipo: TipoArbol;
  posicion: Posicion;
}

/**
 * El incendio que arrasa la jungla: se desplaza, crece y se achica, y quema a
 * quien se quede dentro.
 */
export interface Fuego {
  centro: Posicion;
  radio: number;
  /** 1 si el fuego esta creciendo, -1 si se esta apagando. */
  crecimiento: number;
}

export interface Evento {
  id: number;
  tipo: TipoEvento;
  texto: string;
}

export interface Partida {
  id: string;
  estado: EstadoPartida;
  ganador: Ganador | null;
  motivoFin: MotivoFin | null;
  tiempoRestanteMs: number;
  jugadores: Record<IdJugador, Jugador>;
  arboles: Arbol[];
  recursos: Recurso[];
  fuego: Fuego;
  eventos: Evento[];
  /** Dimensiones del tablero, para que el frontend no las tenga escritas aparte. */
  columnas: number;
  filas: number;

  // Campos internos del servidor (no los usa la interfaz).
  terminaEn: number;
  relojEnergia: number;
  relojArboles: number;
  relojFuego: number;
  relojDanioFuego: number;
  relojRadioFuego: number;
  relojRecursos: number;
  ultimoIdEvento: number;
  ultimoIdRecurso: number;
  ultimoIdArbol: number;
}

export interface Accion {
  jugador: IdJugador;
  tipo: TipoAccion;
  direccion?: Direccion;
}

export type ResultadoAccion =
  | { ok: true }
  | { ok: false; codigo: CodigoError; mensaje: string };

export type CodigoError =
  | 'PARTIDA_NO_ENCONTRADA'
  | 'PARTIDA_TERMINADA'
  | 'ACCION_INVALIDA'
  | 'FUERA_DEL_TABLERO'
  | 'CASILLA_BLOQUEADA'
  | 'CASILLA_OCUPADA'
  | 'SIN_ENERGIA'
  | 'FUERA_DE_ALCANCE'
  | 'EN_ENFRIAMIENTO';
