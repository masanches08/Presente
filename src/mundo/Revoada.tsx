import { useAnimations, useCursor, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  CatmullRomCurve3,
  Vector3,
  type Camera,
  type Group,
  type MeshStandardMaterial,
  type Sprite,
  type SpriteMaterial,
} from "three";
import { ARARA_CARTINHA, ARARA_SEMPRE } from "../data/luademel";
import { desbloquear, jaDesbloqueado } from "../lib/desbloqueios";
import { bate } from "./obstaculos";
import { altura } from "./terreno";

// Revoada: de vez em quando um pássaro atravessa a tela, sempre na frente de onde a câmera está olhando
// (na vista geral, na casa, na praia…), e some do outro lado.
// A arara da cartinha tem horário próprio (ARARA_CARTINHA): passa sozinha e devagar, até ela pegar.
// Tocou nela: o segredo da lua de mel é desbloqueado (e ela não volta mais).

type Tipo = "arara" | "flamingo";
const MODELOS: Record<Tipo, { url: string; escala: number }> = {
  arara: { url: "/models/Parrot.glb", escala: 0.03 },
  flamingo: { url: "/models/Flamingo.glb", escala: 0.021 },
};

// cada "vaga" é um pássaro que fica indo e voltando (várias araras, um flamingo e a arara da cartinha)
const VAGAS: {
  tipo: Tipo;
  primeira: [number, number];
  espera: [number, number];
  cartinha?: boolean;
}[] = [
  { tipo: "arara", primeira: [5, 12], espera: [20, 40] },
  { tipo: "arara", primeira: [14, 24], espera: [26, 46] },
  { tipo: "arara", primeira: [32, 48], espera: [30, 55] },
  { tipo: "flamingo", primeira: [25, 40], espera: [45, 80] },
  {
    tipo: "arara",
    primeira: ARARA_CARTINHA.primeira,
    espera: ARARA_CARTINHA.intervalo,
    cartinha: true,
  },
];
const DURACAO = {
  normal: [13, 18] as [number, number],
  cartinha: [24, 28] as [number, number],
};

const sorteio = ([a, b]: [number, number]) => a + Math.random() * (b - a);

/**
 * Uma rota que cruza a tela de um lado pro outro, na frente da câmera, numa altura boa de ver,
 * sem atravessar a casa, as árvores nem nada (obstaculos.ts). Se a primeira ideia bate em algo,
 * tenta passar mais perto da câmera (na frente das coisas) e, por último, mais alto.
 */
function novaRota(camera: Camera, perto = false) {
  const lado = Math.random() < 0.5 ? 1 : -1;
  const dist = sorteio(perto ? [13, 18] : [22, 32]);
  const subida = sorteio([0, 2.5]);
  for (let tent = 0; tent < 14; tent++) {
    const perto = Math.max(0.35, 1 - tent * 0.09); // vem pra frente das coisas
    const acima = tent < 7 ? 0 : (tent - 6) * 1.6; // ou passa por cima
    const rota = montarRota(camera, lado, Math.max(7, dist * perto), subida + acima);
    if (livre(rota)) return rota;
  }
  // nada deu certo: passa bem lá no alto, acima de tudo
  return montarRota(camera, lado, dist, 14);
}

/** Confere a rota inteira, ponto a ponto */
function livre(rota: CatmullRomCurve3) {
  const p = new Vector3();
  for (let i = 0; i <= 160; i++) {
    rota.getPointAt(i / 160, p);
    if (bate(p.x, p.y, p.z)) return false;
  }
  return true;
}

function montarRota(camera: Camera, lado: number, dist: number, subida: number) {
  const olhar = new Vector3();
  camera.getWorldDirection(olhar);
  const frente = olhar.clone();
  frente.y = 0;
  if (frente.lengthSq() < 1e-4) frente.set(0, 0, -1);
  frente.normalize();
  const direita = new Vector3(-frente.z, 0, frente.x);
  const centro = camera.position.clone().addScaledVector(frente, dist);
  // na altura do meio da tela (onde a câmera está olhando), pra não passar por cima do contador lá em cima
  const alturaBase =
    camera.position.y +
    (olhar.y / Math.max(0.2, Math.hypot(olhar.x, olhar.z))) * dist +
    subida;
  // um arco suave (sem curvas fechadas)
  const pontos = [
    [-64, 10, 4],
    [-30, 2.5, 1.5],
    [0, 0, 0],
    [30, 2.5, 1.5],
    [64, 10, 4],
  ].map(([s, f, h]) => {
    const p = centro
      .clone()
      .addScaledVector(direita, s * lado)
      .addScaledVector(frente, f);
    p.y = Math.max(alturaBase + h, altura(p.x, p.z) + 5);
    return p;
  });
  return new CatmullRomCurve3(pontos, false, "catmullrom", 0.5);
}

/** Estrelinha de 4 pontas (o brilho que pisca em volta da cartinha) */
function texEstrela() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 10);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.moveTo(32, 2);
  ctx.quadraticCurveTo(34, 30, 62, 32);
  ctx.quadraticCurveTo(34, 34, 32, 62);
  ctx.quadraticCurveTo(30, 34, 2, 32);
  ctx.quadraticCurveTo(30, 30, 32, 2);
  ctx.fill();
  return new CanvasTexture(c);
}

/** O brilho redondinho (auréola atrás da cartinha) */
function texBrilho() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

/**
 * A cartinha: envelope com selo de cera, pendurada num barbante.
 * Brilha pra chamar atenção (senão some no céu): auréola dourada pulsando, contorno dourado
 * no envelope, o papel acendendo de leve e estrelinhas piscando em volta.
 */
const ESTRELINHAS = [
  [0.42, 0.22, 0.0],
  [-0.4, 0.16, 1.3],
  [0.3, -0.26, 2.4],
  [-0.34, -0.22, 3.3],
  [0.02, 0.36, 4.2],
  [0.5, -0.04, 5.1],
] as const;

function Cartinha() {
  const balanco = useRef<Group>(null);
  const aureola = useRef<Sprite>(null);
  const papel = useRef<MeshStandardMaterial>(null);
  const estrelas = useRef<(Sprite | null)[]>([]);
  const brilho = useMemo(() => texBrilho(), []);
  const estrela = useMemo(() => texEstrela(), []);
  useFrame(({ clock }) => {
    const g = balanco.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.z = Math.sin(t * 2.6) * 0.25;
    g.rotation.x = Math.sin(t * 1.9) * 0.12;
    const pulso = 0.5 + 0.5 * Math.sin(t * 3.2);
    const a = aureola.current;
    if (a) {
      a.scale.setScalar(1.7 + pulso * 0.7);
      (a.material as SpriteMaterial).opacity = 0.75 + pulso * 0.25;
    }
    if (papel.current) papel.current.emissiveIntensity = 0.35 + pulso * 0.45;
    estrelas.current.forEach((e, i) => {
      if (!e) return;
      const fase = ESTRELINHAS[i][2];
      const v = Math.max(0, Math.sin(t * 2.4 + fase * 1.7));
      e.scale.setScalar(0.05 + v * 0.16);
      (e.material as SpriteMaterial).opacity = v;
    });
  });
  return (
    <group ref={balanco} position={[0, -0.08, -0.05]}>
      {/* barbante */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.44, 4]} />
        <meshBasicMaterial color="#C9A06F" />
      </mesh>
      <group position={[0, -0.56, 0]}>
        {/* auréola dourada atrás (sempre virada pra câmera) */}
        <sprite ref={aureola} scale={1.4} renderOrder={-1}>
          <spriteMaterial map={brilho} color="#FFB347" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0.7} />
        </sprite>
        {/* contorno dourado em volta do envelope */}
        <mesh>
          <boxGeometry args={[0.53, 0.39, 0.012]} />
          <meshBasicMaterial color="#FFD37A" toneMapped={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.46, 0.32, 0.025]} />
          <meshStandardMaterial ref={papel} color="#F6EEDC" emissive="#FFE2A6" emissiveIntensity={0.5} roughness={0.9} />
        </mesh>
        {/* a aba do envelope (dos dois lados) */}
        {[1, -1].map((l) => (
          <mesh
            key={l}
            position={[0, 0.03, l * 0.014]}
            rotation={[0, l === 1 ? 0 : Math.PI, Math.PI]}
          >
            <circleGeometry args={[0.24, 3, Math.PI / 2]} />
            <meshStandardMaterial color="#E9DCC3" emissive="#FFE2A6" emissiveIntensity={0.25} roughness={0.9} />
          </mesh>
        ))}
        {/* selo de cera */}
        {[1, -1].map((l) => (
          <mesh
            key={"s" + l}
            position={[0, -0.04, l * 0.017]}
            rotation-y={l === 1 ? 0 : Math.PI}
          >
            <circleGeometry args={[0.055, 16]} />
            <meshStandardMaterial color="#B3322A" emissive="#7A1A14" emissiveIntensity={0.4} roughness={0.5} />
          </mesh>
        ))}
        {/* estrelinhas piscando em volta */}
        {ESTRELINHAS.map(([x, y], i) => (
          <sprite key={i} ref={(e) => void (estrelas.current[i] = e)} position={[x, y, 0.05]} scale={0.1}>
            <spriteMaterial map={estrela} color="#FFF1C9" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

function Passaro({
  vaga,
  onPegou,
}: {
  vaga: (typeof VAGAS)[number];
  onPegou: () => void;
}) {
  const m = MODELOS[vaga.tipo];
  const { scene, animations } = useGLTF(m.url);
  const copia = useMemo(() => scene.clone(true), [scene]);
  const grupo = useRef<Group>(null);
  const modelo = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, modelo);
  const [comCartinha, setComCartinha] = useState(false);
  const [sobre, setSobre] = useState(false);
  useCursor(sobre && comCartinha);

  const voo = useRef({
    rota: null as CatmullRomCurve3 | null,
    inicio: 0,
    duracao: 15,
    proxima: sorteio(vaga.primeira),
    fuga: -1,
    cartinha: false,
  });
  const ponto = useMemo(() => new Vector3(), []);
  const frente = useMemo(() => new Vector3(), []);
  const adiante = useMemo(() => new Vector3(), []);
  const tela = useMemo(() => new Vector3(), []);
  const debug = useMemo(
    () => new URLSearchParams(window.location.search).has("debug"),
    [],
  );

  useEffect(() => {
    const a = actions[names[0]];
    a?.reset().play();
    if (a) a.timeScale = 0.8 + Math.random() * 0.3;
  }, [actions, names]);

  useFrame(({ clock, camera, size }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const v = voo.current;

    // parado esperando a próxima passada
    if (!v.rota) {
      g.visible = false;
      if (t < v.proxima) return;
      // a arara da cartinha: só enquanto ela não foi pega
      if (vaga.cartinha && !ARARA_SEMPRE && jaDesbloqueado("arara")) {
        v.proxima = Infinity;
        return;
      }
      v.cartinha = !!vaga.cartinha;
      v.rota = novaRota(camera, v.cartinha);
      v.inicio = t;
      v.fuga = -1;
      v.duracao = sorteio(v.cartinha ? DURACAO.cartinha : DURACAO.normal);
      setComCartinha(v.cartinha);
    }

    if (v.fuga === -2) v.fuga = t;
    let u = (t - v.inicio) / v.duracao;
    if (v.fuga >= 0) u = Math.min(1, u + (t - v.fuga) * 0.05); // soltou a cartinha: vai embora mais rápido
    if (u >= 1) {
      g.visible = false;
      v.rota = null;
      v.cartinha = false;
      setComCartinha(false);
      v.proxima = t + sorteio(vaga.espera);
      return;
    }
    g.visible = true;
    v.rota.getPointAt(u, ponto);
    v.rota.getTangentAt(u, frente);
    v.rota.getTangentAt(Math.min(1, u + 0.03), adiante);
    g.position.copy(ponto);
    g.position.y += Math.sin(t * 2.2) * 0.2;
    // direção sempre a da rota (sem atraso), inclinação pequena nas curvas e nunca de ponta-cabeça
    const rumo = Math.atan2(frente.x, frente.z);
    let curva = Math.atan2(adiante.x, adiante.z) - rumo;
    curva = Math.atan2(Math.sin(curva), Math.cos(curva));
    const subida = Math.atan2(frente.y, Math.hypot(frente.x, frente.z));
    g.rotation.set(
      Math.max(-0.3, Math.min(0.3, -subida)),
      rumo,
      Math.max(-0.35, Math.min(0.35, -curva * 3)),
      "YXZ",
    );

    // (teste automático: onde está cada pássaro na tela)
    if (debug) {
      tela.copy(g.position).project(camera);
      const info = {
        visivel: tela.z < 1,
        x: ((tela.x + 1) / 2) * size.width,
        y: ((1 - tela.y) / 2) * size.height,
        tipo: vaga.tipo,
      };
      const w = window as unknown as {
        __arara?: unknown;
        __passaros?: Record<number, unknown>;
      };
      w.__passaros = { ...w.__passaros, [VAGAS.indexOf(vaga)]: { ...info, t } };
      if (v.cartinha && v.fuga === -1) w.__arara = info;
    }
  });

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    const v = voo.current;
    if (!grupo.current?.visible || !v.cartinha || v.fuga >= 0) return;
    e.stopPropagation();
    if (e.delta > 12) return;
    v.fuga = -2; // marcado; o horário certo é pego no próximo quadro
    setComCartinha(false);
    desbloquear("arara");
    onPegou();
  };

  return (
    <group ref={grupo} visible={false}>
      <group ref={modelo} scale={m.escala}>
        <primitive object={copia} />
      </group>
      {/* (fica sempre montada e só aparece quando é a vez dela: assim não trava ao aparecer) */}
      <group visible={comCartinha}>
        <group scale={2.1}>
          <Cartinha />
        </group>
        {/* área de toque bem maior que a arara (ela está voando) */}
        <mesh
          position={[0, -0.6, 0]}
          onClick={tocar}
          onPointerOver={(e) => {
            if (!grupo.current?.visible) return;
            e.stopPropagation();
            setSobre(true);
          }}
          onPointerOut={() => setSobre(false)}
        >
          <sphereGeometry args={[2.8, 10, 8]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function Revoada({ onPegou }: { onPegou: () => void }) {
  return (
    <>
      {VAGAS.map((v, i) => (
        <Passaro key={i} vaga={v} onPegou={onPegou} />
      ))}
    </>
  );
}

for (const m of Object.values(MODELOS)) useGLTF.preload(m.url);
