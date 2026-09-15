/**
 * Endpoints HTTP de la API de Monitos en Fuga.
 *
 * Las partidas se guardan en memoria (un Map) mientras el servidor esta
 * encendido. Para este proyecto no hace falta base de datos: una partida dura
 * 90 segundos y no se necesita historial permanente.
 */

import { Router, Request, Response } from 'express';
import { aplicarAccion, avanzarPartida, crearPartida, terminarPorAbandono } from './juego';
import { Accion, CodigoError, Direccion, IdJugador, Partida, TipoAccion } from './types';

const partidas = new Map<string, Partida>();
const MAXIMO_PARTIDAS_EN_MEMORIA = 50;

function generarId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function guardarPartida(partida: Partida): void {
  // Evita que el Map crezca sin limite si se crean muchas partidas.
  if (partidas.size >= MAXIMO_PARTIDAS_EN_MEMORIA) {
    const masAntigua = partidas.keys().next().value;
    if (masAntigua) partidas.delete(masAntigua);
  }
  partidas.set(partida.id, partida);
}

function responderError(res: Response, estado: number, codigo: CodigoError, mensaje: string): void {
  res.status(estado).json({ error: { codigo, mensaje } });
}

/** Comprueba que el cuerpo recibido sea una accion valida antes de procesarla. */
function leerAccion(cuerpo: unknown): Accion | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;

  const datos = cuerpo as Record<string, unknown>;
  const jugadoresValidos: IdJugador[] = ['p1', 'p2'];
  const tiposValidos: TipoAccion[] = ['mover', 'atacar', 'defender'];
  const direccionesValidas: Direccion[] = ['arriba', 'abajo', 'izquierda', 'derecha'];

  const jugador = datos.jugador as IdJugador;
  const tipo = datos.tipo as TipoAccion;
  const direccion = datos.direccion as Direccion | undefined;

  if (!jugadoresValidos.includes(jugador)) return null;
  if (!tiposValidos.includes(tipo)) return null;
  if (tipo === 'mover' && !direccionesValidas.includes(direccion as Direccion)) return null;

  return { jugador, tipo, direccion };
}

export const rutas = Router();

/** Estado del servicio. Lo usan Playwright y Render para saber si el servidor respondio. */
rutas.get('/salud', (_req: Request, res: Response) => {
  res.json({ estado: 'ok', partidasEnMemoria: partidas.size });
});

/** POST /api/game -> crea una partida nueva y devuelve su estado inicial. */
rutas.post('/game', (_req: Request, res: Response) => {
  const partida = crearPartida(generarId(), Date.now());
  guardarPartida(partida);
  res.status(201).json({ partida });
});

/** GET /api/game/:id -> devuelve el estado actual de la partida. */
rutas.get('/game/:id', (req: Request, res: Response) => {
  const partida = partidas.get(req.params.id);
  if (!partida) {
    responderError(res, 404, 'PARTIDA_NO_ENCONTRADA', 'No existe una partida con ese identificador.');
    return;
  }

  avanzarPartida(partida, Date.now());
  res.json({ partida });
});

/** POST /api/game/:id/finish -> termina la partida antes de tiempo (boton "Terminar partida"). */
rutas.post('/game/:id/finish', (req: Request, res: Response) => {
  const partida = partidas.get(req.params.id);
  if (!partida) {
    responderError(res, 404, 'PARTIDA_NO_ENCONTRADA', 'No existe una partida con ese identificador.');
    return;
  }

  terminarPorAbandono(partida, Date.now());
  res.json({ partida });
});

/** POST /api/game/:id/action -> valida y aplica una accion del jugador. */
rutas.post('/game/:id/action', (req: Request, res: Response) => {
  const partida = partidas.get(req.params.id);
  if (!partida) {
    responderError(res, 404, 'PARTIDA_NO_ENCONTRADA', 'No existe una partida con ese identificador.');
    return;
  }

  const accion = leerAccion(req.body);
  if (!accion) {
    responderError(res, 400, 'ACCION_INVALIDA', 'El cuerpo de la peticion no es una accion valida.');
    return;
  }

  const ahora = Date.now();
  avanzarPartida(partida, ahora);
  const resultado = aplicarAccion(partida, accion, ahora);

  if (!resultado.ok) {
    // Se devuelve tambien la partida para que la pantalla muestre el error.
    res.status(400).json({ error: { codigo: resultado.codigo, mensaje: resultado.mensaje }, partida });
    return;
  }

  res.json({ partida });
});
