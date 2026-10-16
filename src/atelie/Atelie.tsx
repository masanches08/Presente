import { CameraControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import CameraControlsImpl from 'camera-controls'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SRGBColorSpace, type Group, type PerspectiveCamera } from 'three'
import { CoracaoCheio, IconeFechar, SetaEsquerda } from '../components/Icons'
import { ehCelular, GL_LEVE, LimiteFps } from '../lib/leve'
import { apagarVestido, listarVestidos, novoDesenho, salvarVestido, type Desenho } from '../lib/vestidos'
import { ambienteDeSala, liberarMiniaturas, luzes, materialManequim, miniatura, miniaturaPronta, pedestal } from './estudio'
import { IconeCostas, IconeDecote, IconeMangas, IconeSilhueta } from './Icones'
import {
  BUQUES,
  CABECAS,
  CAPAS,
  CAUDAS,
  CINTOS,
  CINTURAS,
  COMPRIMENTOS,
  CORES,
  COSTAS,
  DECOTES,
  deInspiracao,
  INSPIRACOES,
  MANGAS,
  PADRAO,
  RENDAS,
  SILHUETAS,
  TECIDOS,
  VEUS,
  type Inspiracao,
  type Vestido,
} from './modelo'
import { descartar, montarManequim, montarVestido } from './vestido3d'

// 👰 O Ateliê da noiva (abre pelo vestido borrado no fim do píer).
// À esquerda (ou em cima, no celular em pé) o vestido grande, num manequim, girando devagar: dá pra girar
// com o dedo, aproximar e pular pra frente, corpete, costas e cauda. Do lado, o painel:
// "Modelos" (a galeria, cada um em 3D), "Criar" (mexer em tudo) e "Guardados" (os vestidos dela).
// Fica tudo salvo só na conta dela (src/lib/vestidos.ts).

// ---------------- o palco 3D ----------------

type Vista = 'inteiro' | 'corpete' | 'costas' | 'cauda'
const VISTAS: Record<Vista, { pos: [number, number, number]; alvo: [number, number, number]; nome: string }> = {
  inteiro: { pos: [1.35, 1.35, 4.35], alvo: [0, 0.84, -0.15], nome: 'Inteiro' },
  corpete: { pos: [0.32, 1.33, 1.0], alvo: [0, 1.2, 0], nome: 'Corpete' },
  costas: { pos: [-0.55, 1.3, -2.4], alvo: [0, 1.0, -0.1], nome: 'Costas' },
  cauda: { pos: [3.3, 2.2, -2.0], alvo: [0.2, 0.5, -0.75], nome: 'Cauda' },
}

function Estudio() {
  const { gl, scene } = useThree()
  const coisas = useMemo(() => [luzes(), pedestal(), montarManequim(materialManequim())], [])
  useEffect(() => {
    const env = ambienteDeSala(gl)
    scene.environment = env
    scene.environmentIntensity = 0.38
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [gl, scene])
  useEffect(() => () => coisas.forEach(descartar), [coisas])
  return (
    <>
      {coisas.map((o, k) => (
        <primitive key={k} object={o} />
      ))}
    </>
  )
}

/** O vestido: remonta quando muda (no máximo uma vez por quadro, mesmo arrastando um controle) */
function Vestido3D({ v }: { v: Vestido }) {
  const [grupo, setGrupo] = useState<Group | null>(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrupo(montarVestido(v)))
    return () => cancelAnimationFrame(id)
  }, [v])
  // solta o anterior da memória (um tiquinho depois, quando o novo já está na tela)
  useEffect(() => {
    if (!grupo) return
    return () => void window.setTimeout(() => descartar(grupo), 200)
  }, [grupo])
  return grupo ? <primitive object={grupo} /> : null
}

/** A câmera: gira sozinha devagar quando ninguém mexe; pula pras vistas */
function Camera({ vista, pulo, girar }: { vista: Vista; pulo: number; girar: boolean }) {
  const ref = useRef<CameraControlsImpl>(null)
  const { size, camera } = useThree()
  const ultimoToque = useRef(0)
  const aspecto = size.width / size.height
  // tela em pé: abre o ângulo e afasta (o vestido inteiro com cauda cabe)
  const longe = aspecto < 0.85 ? 1.35 : aspecto < 1.1 ? 1.12 : 1
  useEffect(() => {
    const c = camera as PerspectiveCamera
    c.fov = aspecto < 0.85 ? 38 : 32
    c.updateProjectionMatrix()
  }, [aspecto, camera])
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const { pos, alvo } = VISTAS[vista]
    const k = vista === 'inteiro' || vista === 'cauda' ? longe : 1
    c.setLookAt(alvo[0] + (pos[0] - alvo[0]) * k, alvo[1] + (pos[1] - alvo[1]) * k, alvo[2] + (pos[2] - alvo[2]) * k, ...alvo, pulo > 0)
    ultimoToque.current = performance.now()
  }, [vista, pulo, longe])
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.minDistance = 0.4
    c.maxDistance = 7.5
    c.maxPolarAngle = 1.62
    c.smoothTime = 0.5
    c.dollyToCursor = true
    c.setBoundary(undefined)
  }, [])
  useFrame((_, dt) => {
    const c = ref.current
    if (!c || !girar) return
    if (performance.now() - ultimoToque.current > 4500) c.rotate(Math.min(dt, 0.1) * 0.16, 0, false)
  })
  return <CameraControls ref={ref} makeDefault onStart={() => (ultimoToque.current = performance.now())} onEnd={() => (ultimoToque.current = performance.now())} />
}

function Palco({ v, vista, pulo, girar }: { v: Vestido; vista: Vista; pulo: number; girar: boolean }) {
  return (
    <Canvas
      frameloop="never"
      dpr={Math.min(window.devicePixelRatio || 1, ehCelular() ? 2 : 1.75)}
      camera={{ fov: 32, near: 0.03, far: 40, position: [1.6, 1.4, 5] }}
      gl={{ ...GL_LEVE, alpha: true, outputColorSpace: SRGBColorSpace }}
      className="!touch-none"
    >
      <LimiteFps />
      <Estudio />
      <Vestido3D v={v} />
      <Camera vista={vista} pulo={pulo} girar={girar} />
    </Canvas>
  )
}

// ---------------- pecinhas do painel ----------------

function Secao({ titulo, children, dica }: { titulo: string; children: ReactNode; dica?: string }) {
  return (
    <section className="py-4 first:pt-1">
      <h3 className="sobretitulo mb-3 flex items-baseline justify-between gap-2">
        {titulo}
        {dica && <span className="font-serif text-[13px] tracking-normal text-grafite/45 normal-case italic">{dica}</span>}
      </h3>
      {children}
    </section>
  )
}

/** Botões de escolha com desenho (silhueta, decote, costas, mangas) */
function Desenhos<K extends string>({ opcoes, valor, onEscolher, icone, alto = false }: { opcoes: Record<K, string>; valor: K; onEscolher: (k: K) => void; icone: (k: K) => ReactNode; alto?: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.2rem,1fr))] gap-2">
      {(Object.keys(opcoes) as K[]).map((k) => {
        const ativo = k === valor
        return (
          <button
            key={k}
            onClick={() => onEscolher(k)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-1.5 pt-2 pb-1.5 transition active:scale-[0.96] ${ativo ? 'bg-[#FBF1E2] ring-2 ring-dourado/80' : 'bg-white/70 ring-1 ring-dourado/20'}`}
          >
            <span className={`block ${alto ? 'h-14 w-10' : 'h-9 w-12'}`}>{icone(k)}</span>
            <span className={`text-center text-[11.5px] leading-tight ${ativo ? 'font-medium text-grafite' : 'text-grafite/70'}`}>{opcoes[k]}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Botões de escolha só com o nome */
function Chips<K extends string>({ opcoes, valor, onEscolher, sub }: { opcoes: Record<K, string>; valor: K; onEscolher: (k: K) => void; sub?: Partial<Record<K, string>> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(opcoes) as K[]).map((k) => {
        const ativo = k === valor
        return (
          <button
            key={k}
            onClick={() => onEscolher(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition active:scale-[0.96] ${ativo ? 'bg-[#FBF1E2] font-medium text-grafite ring-2 ring-dourado/80' : 'bg-white/70 text-grafite/75 ring-1 ring-dourado/20'}`}
          >
            {opcoes[k]}
            {sub?.[k] && <span className="ml-1.5 font-serif text-[12.5px] text-grafite/45 italic">{sub[k]}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Regua({ nome, valor, onMudar, min = 0, max = 1, passo = 0.01, rotulos }: { nome: string; valor: number; onMudar: (n: number) => void; min?: number; max?: number; passo?: number; rotulos?: [string, string] }) {
  return (
    <label className="block py-1.5">
      <span className="flex items-baseline justify-between text-[13px] text-grafite/75">
        {nome}
        {rotulos && (
          <span className="font-serif text-[12.5px] text-grafite/40 italic">
            {rotulos[0]} · {rotulos[1]}
          </span>
        )}
      </span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onMudar(Number(e.target.value))} className="regua-atelie mt-1.5 w-full" />
    </label>
  )
}

function Chave({ nome, ligado, onMudar, sub }: { nome: string; ligado: boolean; onMudar: (b: boolean) => void; sub?: string }) {
  return (
    <button onClick={() => onMudar(!ligado)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
      <span className="text-[13px] text-grafite/80">
        {nome}
        {sub && <span className="block font-serif text-[12.5px] text-grafite/45 italic">{sub}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${ligado ? 'bg-dourado' : 'bg-grafite/15'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-[1.4rem]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/** A fotinha 3D de um vestido (vai aparecendo conforme fica pronta) */
function Foto({ v, className = '' }: { v: Vestido; className?: string }) {
  const [url, setUrl] = useState(() => miniaturaPronta(v) ?? null)
  useEffect(() => {
    let vivo = true
    miniatura(v).then((u) => vivo && setUrl(u))
    return () => {
      vivo = false
    }
  }, [v])
  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#FFFDF9,#F3E6DC)] ${className}`}>
      <AnimatePresence>
        {url ? (
          <motion.img key="f" src={url} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <motion.div key="c" exit={{ opacity: 0 }} className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/0 via-white/50 to-white/0" />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------- as abas ----------------

function AbaModelos({ v, onEscolher }: { v: Vestido; onEscolher: (i: Inspiracao) => void }) {
  const chave = JSON.stringify(v)
  return (
    <div>
      <p className="mb-4 font-serif text-[17px] leading-snug text-grafite/70 italic">Toque num modelo pra provar no manequim. Depois é só ir em “Criar” e deixar do seu jeito.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 landscape:grid-cols-2">
        {INSPIRACOES.map((i) => {
          const vi = deInspiracao(i)
          const ativo = JSON.stringify(vi) === chave
          return (
            <button key={i.id} onClick={() => onEscolher(i)} className={`overflow-hidden rounded-[20px] bg-white/80 text-left transition active:scale-[0.97] ${ativo ? 'ring-2 ring-dourado' : 'ring-1 ring-dourado/20'}`}>
              <Foto v={vi} className="aspect-[300/420] w-full" />
              <div className="px-3 pt-2 pb-3">
                <p className="font-serif text-[17px] leading-tight text-grafite">{i.nome}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-grafite/55">{i.frase}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const DESC_TECIDO: Record<Vestido['tecido'], string> = {
  cetim: 'liso, brilho suave',
  mikado: 'encorpado',
  crepe: 'fosco, fluido',
  seda: 'levinha',
  tule: 'em camadas',
  zibeline: 'estruturado',
}

function AbaCriar({ v, mudar }: { v: Vestido; mudar: (p: Partial<Vestido>, grupo?: string) => void }) {
  const [parte, setParte] = useState<'silhueta' | 'decote' | 'mangas' | 'saia' | 'tecido' | 'bordados' | 'veu'>('silhueta')
  const PARTES = { silhueta: 'Silhueta', decote: 'Decote', mangas: 'Mangas', saia: 'Saia', tecido: 'Tecido e cor', bordados: 'Bordados', veu: 'Véu e buquê' } as const
  return (
    <div>
      {/* as partes do vestido */}
      <div className="sticky top-0 z-10 -mx-4 mb-1 bg-gradient-to-b from-[#FBF7F1] via-[#FBF7F1] to-[#FBF7F1]/0 px-4 pt-1 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(Object.keys(PARTES) as (keyof typeof PARTES)[]).map((k) => (
            <button key={k} onClick={() => setParte(k)} className={`shrink-0 rounded-full px-3.5 py-1.5 font-serif text-[16px] italic transition ${parte === k ? 'bg-grafite text-white' : 'bg-white/70 text-grafite/70 ring-1 ring-dourado/20'}`}>
              {PARTES[k]}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={parte} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="divide-y divide-dourado/15">
          {parte === 'silhueta' && (
            <>
              <Secao titulo="Silhueta">
                <Desenhos opcoes={SILHUETAS} valor={v.silhueta} onEscolher={(silhueta) => mudar({ silhueta })} icone={(k) => <IconeSilhueta id={k} />} alto />
              </Secao>
              <Secao titulo="Cintura">
                <Chips opcoes={CINTURAS} valor={v.cintura} onEscolher={(cintura) => mudar({ cintura })} />
              </Secao>
              <Secao titulo="Comprimento">
                <Chips opcoes={COMPRIMENTOS} valor={v.comprimento} onEscolher={(comprimento) => mudar({ comprimento })} />
              </Secao>
            </>
          )}
          {parte === 'decote' && (
            <>
              <Secao titulo="Decote">
                <Desenhos opcoes={DECOTES} valor={v.decote} onEscolher={(decote) => mudar({ decote })} icone={(k) => <IconeDecote id={k} />} />
              </Secao>
              <Secao titulo="Costas" dica="gire o manequim pra ver">
                <Desenhos opcoes={COSTAS} valor={v.costas} onEscolher={(costas) => mudar({ costas })} icone={(k) => <IconeCostas id={k} />} />
              </Secao>
            </>
          )}
          {parte === 'mangas' && (
            <>
              <Secao titulo="Mangas e alças">
                <Desenhos opcoes={MANGAS} valor={v.mangas} onEscolher={(mangas) => mudar({ mangas })} icone={(k) => <IconeMangas id={k} />} />
              </Secao>
              <Secao titulo="Acabamento">
                <Chave nome="Mangas de renda transparente" sub="a pele aparecendo por baixo" ligado={v.mangaTransparente} onMudar={(mangaTransparente) => mudar({ mangaTransparente })} />
              </Secao>
            </>
          )}
          {parte === 'saia' && (
            <>
              <Secao titulo="Cauda">
                <Chips opcoes={CAUDAS} valor={v.cauda} onEscolher={(cauda) => mudar({ cauda })} sub={{ capela: '~1 m', catedral: '~2 m', real: '3 m+' }} />
                {v.comprimento !== 'longo' && v.cauda !== 'sem' && <p className="mt-2 font-serif text-[13px] text-grafite/45 italic">(a cauda só aparece no vestido longo)</p>}
              </Secao>
              <Secao titulo="Forma da saia">
                <Regua nome="Volume" rotulos={['fininha', 'bem cheia']} valor={v.volume} onMudar={(volume) => mudar({ volume }, 'volume')} />
                <Regua nome="Pregas e drapeado" rotulos={['lisa', 'muitas pregas']} valor={v.drapeado} onMudar={(drapeado) => mudar({ drapeado }, 'drapeado')} />
                <Regua nome={`Camadas de tule por cima: ${v.camadasTule}`} min={0} max={3} passo={1} valor={v.camadasTule} onMudar={(camadasTule) => mudar({ camadasTule }, 'tule')} />
                <Chave nome="Fenda na perna" sub="na frente, do lado direito" ligado={v.fenda} onMudar={(fenda) => mudar({ fenda })} />
              </Secao>
            </>
          )}
          {parte === 'tecido' && (
            <>
              <Secao titulo="Tecido">
                <Chips opcoes={TECIDOS} valor={v.tecido} onEscolher={(tecido) => mudar({ tecido })} sub={DESC_TECIDO} />
              </Secao>
              <Secao titulo="Cor" dica={CORES[v.cor].nome}>
                <div className="flex flex-wrap gap-2.5">
                  {(Object.keys(CORES) as Vestido['cor'][]).map((k) => (
                    <button
                      key={k}
                      onClick={() => mudar({ cor: k })}
                      aria-label={CORES[k].nome}
                      className={`size-11 rounded-full shadow-[inset_0_-6px_10px_rgb(0_0_0/0.06),0_2px_6px_rgb(46_42_38/0.12)] transition active:scale-95 ${v.cor === k ? 'ring-2 ring-dourado ring-offset-2 ring-offset-[#FBF7F1]' : 'ring-1 ring-grafite/10'}`}
                      style={{ background: `radial-gradient(circle at 35% 30%, #FFFFFF, ${CORES[k].cor} 60%)` }}
                    />
                  ))}
                </div>
              </Secao>
              <Secao titulo="Brilho">
                <Regua nome="Glitter e paetês" rotulos={['nada', 'muito']} valor={v.brilho} onMudar={(brilho) => mudar({ brilho }, 'brilho')} />
              </Secao>
            </>
          )}
          {parte === 'bordados' && (
            <>
              <Secao titulo="Renda">
                <Chips opcoes={RENDAS} valor={v.renda} onEscolher={(renda) => mudar({ renda })} />
                {v.renda !== 'nenhuma' && v.renda !== 'mangas' && <Chave nome="Forro nude por baixo" sub="efeito “tatuagem”: a renda parece desenhada na pele" ligado={v.forroNude} onMudar={(forroNude) => mudar({ forroNude })} />}
              </Secao>
              <Secao titulo="Aplicações">
                <Regua nome="Pérolas bordadas" rotulos={['nenhuma', 'chuva de pérolas']} valor={v.perolas} onMudar={(perolas) => mudar({ perolas }, 'perolas')} />
                <Regua nome="Flores 3D" rotulos={['nenhuma', 'jardim']} valor={v.flores} onMudar={(flores) => mudar({ flores }, 'flores')} />
              </Secao>
              <Secao titulo="Cinto">
                <Chips opcoes={CINTOS} valor={v.cinto} onEscolher={(cinto) => mudar({ cinto })} />
              </Secao>
              <Secao titulo="Capa">
                <Chips opcoes={CAPAS} valor={v.capa} onEscolher={(capa) => mudar({ capa })} />
              </Secao>
            </>
          )}
          {parte === 'veu' && (
            <>
              <Secao titulo="Véu">
                <Chips opcoes={VEUS} valor={v.veu} onEscolher={(veu) => mudar({ veu })} />
                {v.veu !== 'nenhum' && <Chave nome="Borda de renda no véu" ligado={v.veuBordaRenda} onMudar={(veuBordaRenda) => mudar({ veuBordaRenda })} />}
              </Secao>
              <Secao titulo="No cabelo">
                <Chips opcoes={CABECAS} valor={v.cabeca} onEscolher={(cabeca) => mudar({ cabeca })} />
              </Secao>
              <Secao titulo="Buquê">
                <Chips opcoes={BUQUES} valor={v.buque} onEscolher={(buque) => mudar({ buque })} />
              </Secao>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const quando = (iso: string) => {
  const d = new Date(iso)
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'agorinha'
  if (min < 60) return `há ${min} min`
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function AbaGuardados({ desenhos, atualId, onAbrir, onRenomear, onDuplicar, onApagar, onNovo }: { desenhos: Desenho[]; atualId: string; onAbrir: (d: Desenho) => void; onRenomear: (d: Desenho, nome: string) => void; onDuplicar: (d: Desenho) => void; onApagar: (d: Desenho) => void; onNovo: () => void }) {
  const [editando, setEditando] = useState<string | null>(null)
  const [apagando, setApagando] = useState<string | null>(null)
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 font-serif text-[17px] text-grafite/70 italic">
        <CoracaoCheio className="size-4 text-rosado" /> só você vê esses vestidos
      </p>
      <button onClick={onNovo} className="mb-3 flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-dourado/50 py-3.5 font-serif text-[17px] text-grafite/70 italic active:scale-[0.98]">
        + começar um do zero
      </button>
      {desenhos.length === 0 && <p className="py-6 text-center font-serif text-[16px] text-grafite/45 italic">Ainda nenhum. Escolha um modelo ou mexa em qualquer coisa: ele se guarda sozinho.</p>}
      <div className="space-y-3">
        {desenhos.map((d) => (
          <div key={d.id} className={`flex gap-3 rounded-[20px] bg-white/80 p-2 pr-3 ${d.id === atualId ? 'ring-2 ring-dourado' : 'ring-1 ring-dourado/20'}`}>
            <button onClick={() => onAbrir(d)} className="shrink-0 overflow-hidden rounded-2xl">
              <Foto v={d.v} className="h-28 w-20" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              {editando === d.id ? (
                <input
                  autoFocus
                  defaultValue={d.nome}
                  maxLength={40}
                  onBlur={(e) => {
                    onRenomear(d, e.target.value.trim() || d.nome)
                    setEditando(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="w-full rounded-lg bg-creme px-2 py-1 font-serif text-[18px] outline-none ring-1 ring-dourado/40"
                />
              ) : (
                <button onClick={() => onAbrir(d)} className="text-left">
                  <p className="truncate font-serif text-[18px] text-grafite">{d.nome}</p>
                  <p className="text-[11.5px] text-grafite/45">
                    {SILHUETAS[d.v.silhueta]} · {DECOTES[d.v.decote]} · {quando(d.atualizado)}
                  </p>
                </button>
              )}
              {apagando === d.id ? (
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-grafite/60">apagar mesmo?</span>
                  <button onClick={() => onApagar(d)} className="rounded-full bg-terracota/90 px-3 py-1 text-white">
                    apagar
                  </button>
                  <button onClick={() => setApagando(null)} className="rounded-full px-2 py-1 text-grafite/60">
                    não
                  </button>
                </div>
              ) : (
                <div className="flex gap-1 text-[12.5px] text-grafite/60">
                  <button onClick={() => setEditando(d.id)} className="rounded-full px-2.5 py-1 ring-1 ring-dourado/25">
                    renomear
                  </button>
                  <button onClick={() => onDuplicar(d)} className="rounded-full px-2.5 py-1 ring-1 ring-dourado/25">
                    duplicar
                  </button>
                  <button onClick={() => setApagando(d.id)} className="rounded-full px-2.5 py-1 ring-1 ring-dourado/25">
                    apagar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------- surpreenda-me ----------------

const umDe = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)]
const chaves = <K extends string>(o: Record<K, unknown>) => Object.keys(o) as K[]
function sortear(): Vestido {
  const r = Math.random
  const renda = r() < 0.5 ? 'nenhuma' : umDe(chaves(RENDAS))
  return {
    silhueta: umDe(chaves(SILHUETAS)),
    cintura: r() < 0.6 ? 'natural' : umDe(chaves(CINTURAS)),
    decote: umDe(chaves(DECOTES)),
    costas: umDe(chaves(COSTAS)),
    mangas: r() < 0.35 ? 'sem' : umDe(chaves(MANGAS)),
    mangaTransparente: r() < 0.4,
    comprimento: r() < 0.85 ? 'longo' : umDe(['midi', 'curto'] as const),
    cauda: umDe(chaves(CAUDAS)),
    volume: 0.3 + r() * 0.6,
    drapeado: r() * 0.8,
    camadasTule: r() < 0.55 ? 0 : 1 + Math.floor(r() * 3),
    fenda: r() < 0.15,
    tecido: umDe(chaves(TECIDOS)),
    cor: r() < 0.6 ? umDe(['branco', 'offwhite', 'perola'] as const) : umDe(chaves(CORES)),
    brilho: r() < 0.65 ? 0 : 0.3 + r() * 0.6,
    renda,
    forroNude: renda !== 'nenhuma' && r() < 0.5,
    perolas: r() < 0.7 ? 0 : 0.2 + r() * 0.7,
    flores: r() < 0.75 ? 0 : 0.2 + r() * 0.7,
    cinto: r() < 0.55 ? 'nenhum' : umDe(chaves(CINTOS)),
    capa: r() < 0.85 ? 'nenhuma' : umDe(['curta', 'longa'] as const),
    veu: umDe(chaves(VEUS)),
    veuBordaRenda: r() < 0.35,
    cabeca: umDe(chaves(CABECAS)),
    buque: umDe(chaves(BUQUES)),
  }
}

// ---------------- o Ateliê ----------------

type Aba = 'modelos' | 'criar' | 'guardados'
const CHAVE_BOAS_VINDAS = 'nosso-lar:atelie-boas-vindas'

export default function Atelie({ onFechar }: { onFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('modelos')
  const [desenhos, setDesenhos] = useState<Desenho[]>([])
  const [atual, setAtual] = useState<Desenho>(() => novoDesenho('Meu vestido', PADRAO))
  /** o atual já está entre os guardados? (um modelo só "provado" ainda não) */
  const [guardado, setGuardado] = useState(false)
  const [sujo, setSujo] = useState(false)
  const [salvando, setSalvando] = useState<'nada' | 'salvando' | 'salvo'>('nada')
  const [hist, setHist] = useState<{ antes: Vestido[]; depois: Vestido[] }>({ antes: [], depois: [] })
  const ultimoGrupo = useRef<{ grupo: string; t: number } | null>(null)
  const [vista, setVista] = useState<Vista>('inteiro')
  const [pulo, setPulo] = useState(0)
  const [girar, setGirar] = useState(true)
  const [boasVindas, setBoasVindas] = useState(() => {
    try {
      return !localStorage.getItem(CHAVE_BOAS_VINDAS)
    } catch {
      return true
    }
  })

  // abre no último vestido dela
  useEffect(() => {
    listarVestidos().then((l) => {
      setDesenhos(l)
      if (l[0]) {
        setAtual(l[0])
        setGuardado(true)
        setAba('criar')
      }
    })
    return () => liberarMiniaturas()
  }, [])

  const mudar = useCallback(
    (p: Partial<Vestido>, grupo?: string) => {
      setAtual((a) => {
        // arrastando o mesmo controle: vira um "passo" só no desfazer
        const agora = performance.now()
        const junta = grupo && ultimoGrupo.current?.grupo === grupo && agora - ultimoGrupo.current.t < 900
        ultimoGrupo.current = grupo ? { grupo, t: agora } : null
        if (!junta) setHist((h) => ({ antes: [...h.antes.slice(-60), a.v], depois: [] }))
        return { ...a, v: { ...a.v, ...p } }
      })
      setSujo(true)
    },
    [],
  )

  const desfazer = () => {
    const anterior = hist.antes[hist.antes.length - 1]
    if (!anterior) return
    setHist((h) => ({ antes: h.antes.slice(0, -1), depois: [atual.v, ...h.depois] }))
    setAtual((a) => ({ ...a, v: anterior }))
    ultimoGrupo.current = null
    setSujo(true)
  }
  const refazer = () => {
    const prox = hist.depois[0]
    if (!prox) return
    setHist((h) => ({ antes: [...h.antes, atual.v], depois: h.depois.slice(1) }))
    setAtual((a) => ({ ...a, v: prox }))
    ultimoGrupo.current = null
    setSujo(true)
  }

  // guarda sozinho, um tiquinho depois da última mudança
  useEffect(() => {
    if (!sujo) return
    setSalvando('salvando')
    const id = window.setTimeout(async () => {
      const salvo = await salvarVestido(atual)
      setDesenhos((l) => [salvo, ...l.filter((x) => x.id !== salvo.id)])
      setGuardado(true)
      setSujo(false)
      setSalvando('salvo')
    }, 900)
    return () => window.clearTimeout(id)
  }, [sujo, atual])
  useEffect(() => {
    if (salvando !== 'salvo') return
    const id = window.setTimeout(() => setSalvando('nada'), 2200)
    return () => window.clearTimeout(id)
  }, [salvando])

  const abrir = (d: Desenho, provando = false) => {
    setAtual(d)
    setGuardado(!provando)
    setSujo(false)
    setHist({ antes: [], depois: [] })
    ultimoGrupo.current = null
  }
  const provarModelo = (i: Inspiracao) => {
    abrir(novoDesenho(i.nome, deInspiracao(i)), true)
    if (vista !== 'inteiro') setVista('inteiro')
  }
  const guardarAgora = () => setSujo(true)
  const surpresa = () => {
    if (!guardado) mudar(sortear())
    else {
      // num vestido já guardado, a surpresa vira um vestido novo (o dela fica intacto)
      abrir(novoDesenho('Surpresa', sortear()), true)
    }
  }

  const fecharBoasVindas = () => {
    setBoasVindas(false)
    try {
      localStorage.setItem(CHAVE_BOAS_VINDAS, '1')
    } catch {
      // (tudo bem: só aparece de novo)
    }
  }

  const irVista = (k: Vista) => {
    setVista(k)
    setPulo((n) => n + 1)
  }

  const ABAS: Record<Aba, string> = { modelos: 'Modelos', criar: 'Criar', guardados: 'Guardados' }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#FBF7F1] landscape:flex-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ---------- o palco ---------- */}
      <div className={`relative min-h-0 flex-[1.1] bg-[radial-gradient(ellipse_at_50%_32%,#FFFDF9_0%,#F7ECE2_52%,#EBD8CC_100%)] landscape:flex-[1.35]`}>
        {/* um arco de janela bem clarinho no fundo, como num ateliê */}
        <div className="pointer-events-none absolute top-[9%] left-1/2 h-[78%] w-[min(62%,26rem)] -translate-x-1/2 rounded-t-full bg-gradient-to-b from-white/70 to-white/0" />
        <div className="absolute inset-0">
          <Palco v={atual.v} vista={vista} pulo={pulo} girar={girar} />
        </div>

        {/* em cima: voltar, o nome, desfazer/refazer */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
          <button onClick={onFechar} className="flex items-center gap-1 rounded-full bg-white/75 py-2 pr-4 pl-2 font-serif text-lg text-grafite/80 italic shadow-suave ring-1 ring-dourado/20 active:scale-[0.97]">
            <SetaEsquerda className="size-5" /> píer
          </button>
          <div className="min-w-0 pt-1 text-center">
            <p className="sobretitulo">ateliê da noiva</p>
            <p className="truncate font-serif text-[20px] text-grafite/85 italic">
              {atual.nome}
              <AnimatePresence>
                {salvando !== 'nada' && guardado && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2 align-middle font-sans text-[11px] text-salvia-escuro not-italic">
                    {salvando === 'salvando' ? 'guardando…' : 'guardado ✓'}
                  </motion.span>
                )}
              </AnimatePresence>
            </p>
            {/* provando um modelo (ainda não é dela): guardar */}
            <AnimatePresence>
              {!guardado && (
                <motion.button
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={guardarAgora}
                  className="mt-1.5 rounded-full bg-grafite/85 px-3.5 py-1 font-serif text-[15px] whitespace-nowrap text-white italic shadow-suave active:scale-[0.97]"
                >
                  ♡ guardar este
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-1.5">
            <button onClick={desfazer} disabled={!hist.antes.length} aria-label="Desfazer" className="grid size-10 place-items-center rounded-full bg-white/75 text-grafite/75 shadow-suave ring-1 ring-dourado/20 transition disabled:opacity-35">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
            </button>
            <button onClick={refazer} disabled={!hist.depois.length} aria-label="Refazer" className="grid size-10 place-items-center rounded-full bg-white/75 text-grafite/75 shadow-suave ring-1 ring-dourado/20 transition disabled:opacity-35">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
              </svg>
            </button>
          </div>
        </div>

        {/* embaixo: as vistas, girar e surpreenda-me */}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1.5 px-3 pb-3">
          <div className="flex rounded-full bg-white/75 p-1 shadow-suave ring-1 ring-dourado/20">
            {(Object.keys(VISTAS) as Vista[]).map((k) => (
              <button key={k} onClick={() => irVista(k)} className={`rounded-full px-3 py-1.5 text-[12.5px] transition ${vista === k ? 'bg-grafite text-white' : 'text-grafite/70'}`}>
                {VISTAS[k].nome}
              </button>
            ))}
          </div>
          <button onClick={() => setGirar((g) => !g)} aria-label={girar ? 'Parar de girar' : 'Girar'} className={`grid size-10 place-items-center rounded-full shadow-suave ring-1 ring-dourado/20 transition ${girar ? 'bg-white/75 text-grafite/75' : 'bg-grafite text-white'}`}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              {girar ? (
                <>
                  <path d="M10 8v8M14 8v8" />
                </>
              ) : (
                <>
                  <path d="M20 12a8 8 0 1 1-2.3-5.6" />
                  <path d="M20 4v4.5h-4.5" />
                </>
              )}
            </svg>
          </button>
          <button onClick={surpresa} className="rounded-full bg-white/75 px-3.5 py-2 font-serif text-[15px] text-grafite/80 italic shadow-suave ring-1 ring-dourado/20 active:scale-[0.97]">
            surpreenda-me ✨
          </button>
        </div>
      </div>

      {/* ---------- o painel ---------- */}
      <div className="relative flex min-h-0 flex-1 flex-col border-dourado/20 bg-[#FBF7F1] shadow-[0_-10px_30px_-18px_rgb(46_42_38/0.3)] landscape:max-w-[27rem] landscape:border-l">
        <div className="flex justify-center gap-1 px-4 pt-3 pb-2" style={{ paddingTop: 'calc(0.75rem)' }}>
          {(Object.keys(ABAS) as Aba[]).map((k) => (
            <button key={k} onClick={() => setAba(k)} className={`relative px-4 py-1.5 font-serif text-[20px] italic transition ${aba === k ? 'text-grafite' : 'text-grafite/45'}`}>
              {ABAS[k]}
              {aba === k && <motion.span layoutId="aba-atelie" className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-dourado" />}
              {k === 'guardados' && desenhos.length > 0 && <span className="ml-1 align-top font-sans text-[10px] text-dourado not-italic">{desenhos.length}</span>}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {aba === 'modelos' && <AbaModelos v={atual.v} onEscolher={provarModelo} />}
          {aba === 'criar' && <AbaCriar v={atual.v} mudar={mudar} />}
          {aba === 'guardados' && (
            <AbaGuardados
              desenhos={desenhos}
              atualId={atual.id}
              onAbrir={(d) => abrir(d)}
              onRenomear={async (d, nome) => {
                const salvo = await salvarVestido({ ...d, nome })
                setDesenhos((l) => l.map((x) => (x.id === d.id ? salvo : x)))
                if (atual.id === d.id) setAtual((a) => ({ ...a, nome }))
              }}
              onDuplicar={async (d) => {
                const copia = await salvarVestido(novoDesenho(`${d.nome} (2)`, d.v))
                setDesenhos((l) => [copia, ...l])
                abrir(copia)
              }}
              onApagar={async (d) => {
                await apagarVestido(d.id)
                setDesenhos((l) => l.filter((x) => x.id !== d.id))
                if (atual.id === d.id) abrir(novoDesenho('Meu vestido', PADRAO), true)
              }}
              onNovo={() => {
                abrir(novoDesenho('Meu vestido', PADRAO), true)
                setAba('criar')
              }}
            />
          )}
        </div>
      </div>

      {/* ---------- boas-vindas (só na primeira vez) ---------- */}
      <AnimatePresence>
        {boasVindas && (
          <motion.div className="fixed inset-0 z-10 grid place-items-center bg-[#2E2A26]/25 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="relative w-full max-w-sm rounded-[30px] bg-papel p-7 text-center shadow-suave ring-1 ring-dourado/25"
            >
              <button onClick={fecharBoasVindas} aria-label="Fechar" className="absolute top-4 right-4 text-grafite/40">
                <IconeFechar className="size-5" />
              </button>
              <p className="sobretitulo">ateliê da noiva</p>
              <h2 className="mt-2 font-serif text-[30px] leading-tight text-grafite italic">Esse cantinho é só seu</h2>
              <p className="mt-3 font-serif text-[18px] leading-snug text-grafite/70">
                Prove os modelos, mexa em tudo e desenhe o vestido dos seus sonhos, quantos quiser.
                <br />
                Fica guardado só pra você: ninguém mais vê. Nem eu. 🤍
              </p>
              <button onClick={fecharBoasVindas} className="mt-6 rounded-full bg-grafite px-7 py-2.5 font-serif text-[18px] text-white italic active:scale-[0.97]">
                entrar no ateliê
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
