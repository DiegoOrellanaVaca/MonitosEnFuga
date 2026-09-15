/**
 * Comunicacion con el backend.
 * Se usa unicamente fetch (la API nativa del navegador) y JSON.
 * Como Express sirve el frontend, las rutas son relativas: mismo dominio y puerto.
 */

import { Accion, ErrorApi, Partida } from './types/juego';

const BASE = '/api';

const CABECERAS_JSON = { 'Content-Type': 'application/json' };

/** POST /api/game -> crea una partida nueva. */
export async function crearPartida(): Promise<Partida> {
  const respuesta = await fetch(`${BASE}/game`, {
    method: 'POST',
    headers: CABECERAS_JSON,
    body: JSON.stringify({})
  });

  if (!respuesta.ok) {
    throw new Error('El servidor no pudo crear la partida.');
  }

  const datos = (await respuesta.json()) as { partida: Partida };
  return datos.partida;
}

/** GET /api/game/:id -> estado actual de la partida. */
export async function obtenerPartida(id: string): Promise<Partida> {
  const respuesta = await fetch(`${BASE}/game/${id}`);

  if (!respuesta.ok) {
    throw new Error('El servidor no devolvio la partida.');
  }

  const datos = (await respuesta.json()) as { partida: Partida };
  return datos.partida;
}

export interface RespuestaAccion {
  partida: Partida | null;
  /** Cuando la accion es invalida el backend explica por que. */
  error: ErrorApi | null;
}

/** POST /api/game/:id/action -> el backend valida y aplica la accion. */
export async function enviarAccion(id: string, accion: Accion): Promise<RespuestaAccion> {
  const respuesta = await fetch(`${BASE}/game/${id}/action`, {
    method: 'POST',
    headers: CABECERAS_JSON,
    body: JSON.stringify(accion)
  });

  const datos = (await respuesta.json()) as { partida?: Partida; error?: ErrorApi };
  return { partida: datos.partida ?? null, error: datos.error ?? null };
}

/** POST /api/game/:id/finish -> termina la partida antes de que se acabe el tiempo. */
export async function terminarPartida(id: string): Promise<Partida> {
  const respuesta = await fetch(`${BASE}/game/${id}/finish`, {
    method: 'POST',
    headers: CABECERAS_JSON,
    body: JSON.stringify({})
  });

  if (!respuesta.ok) {
    throw new Error('El servidor no pudo terminar la partida.');
  }

  const datos = (await respuesta.json()) as { partida: Partida };
  return datos.partida;
}
