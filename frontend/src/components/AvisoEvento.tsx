/**
 * Aviso flotante sobre la jungla con el ultimo evento que envio el servidor:
 * golpes, comida, quemaduras y, sobre todo, acciones invalidas. Aparece un
 * momento y se oculta solo, asi no ocupa espacio fijo en la pantalla.
 */

import { useEffect, useState } from 'react';
import { Evento } from '../types/juego';

interface Props {
  eventos: Evento[];
}

const DURACION_AVISO_MS = 2_500;

export function AvisoEvento({ eventos }: Props) {
  const ultimo = eventos.length > 0 ? eventos[eventos.length - 1] : null;
  const idUltimo = ultimo ? ultimo.id : null;
  /** Id del evento cuyo aviso ya se oculto. */
  const [idOculto, setIdOculto] = useState<number | null>(null);

  // Cada evento nuevo reinicia la cuenta atras para ocultar el aviso.
  useEffect(() => {
    if (idUltimo === null) return;
    const temporizador = window.setTimeout(() => setIdOculto(idUltimo), DURACION_AVISO_MS);
    return () => window.clearTimeout(temporizador);
  }, [idUltimo]);

  if (!ultimo || ultimo.id === idOculto) return null;

  return (
    <div key={ultimo.id} className={`aviso aviso-${ultimo.tipo}`} data-testid="aviso-evento">
      {ultimo.texto}
    </div>
  );
}
