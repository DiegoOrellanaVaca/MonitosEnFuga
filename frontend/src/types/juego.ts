/**
 * Tipos del estado de la partida tal como los envia el backend.
 * Es la copia (en el lado del cliente) de backend/src/types.ts.
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
  defendiendo: boolean;
  sobrecargado: boolean;
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

/** El incendio: se desplaza, crece y se achica. */
export interface Fuego {
  centro: Posicion;
  radio: number;
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
  columnas: number;
  filas: number;
}

export interface Accion {
  jugador: IdJugador;
  tipo: TipoAccion;
  direccion?: Direccion;
}

export interface ErrorApi {
  codigo: string;
  mensaje: string;
}
