/** Pantalla inicial: explica el juego, muestra los controles y permite empezar. */

interface Props {
  onIniciar: () => void;
  cargando: boolean;
  error: string | null;
}

export function PantallaInicio({ onIniciar, cargando, error }: Props) {
  return (
    <div className="pantalla-inicio">
      <div className="inicio-contenido">
        <h1 className="titulo-juego">
          POLLITOS <span>EN FUGA</span>
        </h1>
        <p className="inicio-lema">
          La jungla esta en llamas. Monito y Monita compiten por la ultima comida que queda mientras
          el incendio avanza, crece y se apaga sin avisar.
        </p>

        <div className="inicio-columnas">
          <section className="tarjeta">
            <h2>Como se juega</h2>
            <ul>
              <li>Dos jugadores en el mismo teclado, 90 segundos de partida.</li>
              <li>Come pizzas para sumar puntos y pollo frito para recuperar energia.</li>
              <li>Golpea al otro mono si esta a 2 casillas o menos: le quitas vida y ganas 8 puntos.</li>
              <li>Cubrete con hojas para recibir un 60% menos de dano durante 3 segundos.</li>
              <li>El incendio se desplaza solo, crece y se achica, y quema 5 de vida por segundo.</li>
              <li>La jungla cambia: los arboles brotan y desaparecen en otros sitios.</li>
              <li>Gana quien deje al rival sin vida o quien tenga mas puntos al acabar el tiempo.</li>
            </ul>
          </section>

          <section className="tarjeta">
            <h2>Controles</h2>
            <div className="controles-inicio">
              <div className="controles-jugador jugador1">
                <h3>Monito</h3>
                <p>
                  <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> mover
                </p>
                <p>
                  <kbd>F</kbd> golpear · <kbd>G</kbd> hojas
                </p>
              </div>
              <div className="controles-jugador jugador2">
                <h3>Monita</h3>
                <p>
                  <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> mover
                </p>
                <p>
                  <kbd>L</kbd> golpear · <kbd>K</kbd> hojas
                </p>
              </div>
            </div>
          </section>

          <section className="tarjeta">
            <h2>Que hay en la jungla</h2>
            <ul className="lista-objetos">
              <li>
                <img src="/sprites/pizza.svg" alt="Pizza" /> Pizza: +15 puntos
              </li>
              <li>
                <img src="/sprites/pollo.svg" alt="Pollo frito" /> Pollo frito: +35 de energia
              </li>
              <li>
                <img src="/sprites/sushi.svg" alt="Sushi" /> Sushi: golpe doble por 6 segundos
              </li>
              <li>
                <img src="/sprites/ceiba.svg" alt="Arbol" /> Arboles: bloquean el paso y van cambiando
              </li>
              <li>
                <img src="/sprites/fuego.svg" alt="Fuego" /> Fuego: 5 de vida por segundo
              </li>
            </ul>
          </section>
        </div>

        {error && (
          <p className="mensaje-error" data-testid="error-conexion">
            {error}
          </p>
        )}

        <button
          className="boton-principal"
          onClick={onIniciar}
          disabled={cargando}
          data-testid="boton-iniciar"
        >
          {cargando ? 'Creando partida...' : 'Iniciar partida'}
        </button>
        <p className="inicio-nota">La partida la crea y la controla el servidor Express.</p>
      </div>
    </div>
  );
}
