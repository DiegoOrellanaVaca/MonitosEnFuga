/** Panel inferior con el estado de un mono: vida, energia, puntos, efectos y teclas. */

import { Jugador } from '../types/juego';

export interface Teclas {
  mover: string;
  golpear: string;
  hojas: string;
}

interface Props {
  jugador: Jugador;
  /** Teclas de este mono, para tenerlas siempre a la vista durante la partida. */
  teclas: Teclas;
}

export function PanelJugador({ jugador, teclas }: Props) {
  const sprite = jugador.id === 'p1' ? '/sprites/monito.svg' : '/sprites/monita.svg';

  return (
    <section className={`panel-jugador ${jugador.id}`} data-testid={`panel-${jugador.id}`}>
      <div className="panel-cabecera">
        <img className="panel-sprite" src={sprite} alt={jugador.nombre} />
        <h2>{jugador.nombre}</h2>
      </div>

      <div className="panel-barras">
        <div className="barra-estado">
          <div className="barra-etiqueta">
            <span>Vida</span>
            <span data-testid={`vida-${jugador.id}`}>{jugador.vida}</span>
          </div>
          <div className="barra-fondo">
            <div className="barra-relleno barra-vida" style={{ width: `${jugador.vida}%` }} />
          </div>
        </div>

        <div className="barra-estado">
          <div className="barra-etiqueta">
            <span>Energia</span>
            <span data-testid={`energia-${jugador.id}`}>{jugador.energia}</span>
          </div>
          <div className="barra-fondo">
            <div className="barra-relleno barra-energia" style={{ width: `${jugador.energia}%` }} />
          </div>
        </div>
      </div>

      <div className="puntos">
        <span>Puntos</span>
        <strong data-testid={`puntos-${jugador.id}`}>{jugador.puntos}</strong>
      </div>

      <div className="panel-extra">
        <div className="etiquetas-estado">
          {jugador.defendiendo && (
            <span className="etiqueta escudo" data-testid={`escudo-${jugador.id}`}>
              Cubierto con hojas
            </span>
          )}
          {jugador.sobrecargado && <span className="etiqueta sobrecarga">Golpe doble</span>}
          {!jugador.defendiendo && !jugador.sobrecargado && (
            <span className="etiqueta neutra">Sin efectos</span>
          )}
        </div>
        <p className="teclas-panel">
          <kbd>{teclas.mover}</kbd> mover <kbd>{teclas.golpear}</kbd> golpear <kbd>{teclas.hojas}</kbd>{' '}
          hojas
        </p>
      </div>
    </section>
  );
}
