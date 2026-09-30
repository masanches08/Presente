import { elementosMarcador } from '../mundo/marcadores'
import { PONTOS, type PontoId } from '../mundo/pontos'

/** Etiquetas com o nome de cada coisa do mundo (quem posiciona é o 3D, a cada quadro). */
export function Marcadores({ foco, visivel, onFocar }: { foco: PontoId | null; visivel: boolean; onFocar: (id: PontoId) => void }) {
  const escondido = !visivel || !!foco
  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {PONTOS.map((p) => (
        <button
          key={p.id}
          ref={(el) => {
            if (el) elementosMarcador.set(p.id, el)
            else elementosMarcador.delete(p.id)
          }}
          onClick={() => onFocar(p.id)}
          tabIndex={escondido ? -1 : 0}
          className="absolute top-0 left-0 invisible pointer-events-auto"
        >
          <span className={`marcador ${escondido ? 'marcador-oculto' : ''}`}>
            <span className="marcador-ponto" />
            <span className="marcador-nome">{p.titulo}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
