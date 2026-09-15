/**
 * Arena del juego: dibuja los arboles, el incendio, las comidas y los monos.
 * Cada elemento se coloca en porcentajes sobre el tablero, asi la arena se
 * adapta al tamano de la pantalla sin recalcular nada en JavaScript.
 */

import { CSSProperties } from 'react';
import { Partida, Posicion, TipoArbol, TipoRecurso } from '../types/juego';
import { AvisoEvento } from './AvisoEvento';

interface Props {
  partida: Partida;
}

const SPRITES_RECURSO: Record<TipoRecurso, string> = {
  pizza: '/sprites/pizza.svg',
  pollo: '/sprites/pollo.svg',
  sushi: '/sprites/sushi.svg'
};

const NOMBRES_RECURSO: Record<TipoRecurso, string> = {
  pizza: 'Pizza',
  pollo: 'Pollo frito',
  sushi: 'Sushi'
};

const SPRITES_ARBOL: Record<TipoArbol, string> = {
  ceiba: '/sprites/ceiba.svg',
  palmera: '/sprites/palmera.svg',
  arbusto: '/sprites/arbusto.svg'
};

/** Posicion y tamano de un elemento que ocupa "ancho x alto" casillas. */
function estiloCasilla(
  posicion: Posicion,
  partida: Partida,
  ancho = 1,
  alto = 1
): CSSProperties {
  return {
    left: `${(posicion.x * 100) / partida.columnas}%`,
    top: `${(posicion.y * 100) / partida.filas}%`,
    width: `${(ancho * 100) / partida.columnas}%`,
    height: `${(alto * 100) / partida.filas}%`
  };
}

export function Arena({ partida }: Props) {
  const { fuego } = partida;
  const ladoFuego = fuego.radio * 2 + 1;
  const esquinaFuego: Posicion = { x: fuego.centro.x - fuego.radio, y: fuego.centro.y - fuego.radio };

  return (
    <div className="arena-contenedor">
      <div
        className="arena"
        data-testid="arena"
        style={
          {
            '--columnas': partida.columnas,
            '--filas': partida.filas
          } as CSSProperties
        }
      >
        {/* El incendio: area movil que crece, se achica y quema */}
        <div
          className="fuego"
          data-testid="fuego"
          data-radio={fuego.radio}
          style={
            {
              ...estiloCasilla(esquinaFuego, partida, ladoFuego, ladoFuego),
              '--lado-fuego': ladoFuego
            } as CSSProperties
          }
        >
          <span className="fuego-etiqueta">INCENDIO</span>
        </div>

        {/* Los arboles brotan y desaparecen durante la partida: la key es su id
            para que React anime cada uno al aparecer. */}
        {partida.arboles.map((arbol) => (
          <img
            key={arbol.id}
            className={`arbol arbol-${arbol.tipo}`}
            data-testid="arbol"
            src={SPRITES_ARBOL[arbol.tipo]}
            alt={arbol.tipo}
            style={estiloCasilla(arbol.posicion, partida)}
          />
        ))}

        {partida.recursos.map((recurso) => (
          <img
            key={recurso.id}
            className={`recurso recurso-${recurso.tipo}`}
            data-testid="recurso"
            src={SPRITES_RECURSO[recurso.tipo]}
            alt={NOMBRES_RECURSO[recurso.tipo]}
            style={estiloCasilla(recurso.posicion, partida)}
          />
        ))}

        {[partida.jugadores.p1, partida.jugadores.p2].map((jugador) => (
          <div
            key={jugador.id}
            className={`jugador ${jugador.id} ${jugador.defendiendo ? 'con-escudo' : ''} ${
              jugador.sobrecargado ? 'con-sobrecarga' : ''
            }`}
            data-testid={`jugador-${jugador.id}`}
            data-x={jugador.posicion.x}
            data-y={jugador.posicion.y}
            style={estiloCasilla(jugador.posicion, partida)}
          >
            <img
              src={jugador.id === 'p1' ? '/sprites/monito.svg' : '/sprites/monita.svg'}
              alt={jugador.nombre}
            />
          </div>
        ))}

        <AvisoEvento eventos={partida.eventos} />
      </div>
    </div>
  );
}
