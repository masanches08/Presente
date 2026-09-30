import type { Material } from 'three'

/** Relógio compartilhado do vento (atualizado uma vez por quadro, na Cena) */
export const vento = { uTempo: { value: 0 } }

interface Opcoes {
  /** Quanto balança */
  forca?: number
  /** Altura (no desenho do objeto) a partir da qual balança 100% */
  altura?: number
  /** Se definido, o objeto inteiro balança com essa intensidade fixa (ex.: a cabeça das flores) */
  fixo?: number
}

/**
 * Faz um material balançar com o vento. O cálculo usa a posição no mundo,
 * então o campo inteiro ondula junto, como vento de verdade passando.
 */
export function aplicarVento(mat: Material, { forca = 1, altura = 1, fixo }: Opcoes = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTempo = vento.uTempo
    const k = fixo !== undefined ? fixo.toFixed(3) : `pow(clamp(position.y / ${altura.toFixed(3)}, 0.0, 1.0), 2.0)`
    shader.vertexShader =
      'uniform float uTempo;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        /* glsl */ `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vec4 noMundo = modelMatrix * mvPosition;
        float kv = ${k};
        float rajada = sin(uTempo * 0.45 + noMundo.x * 0.04 - noMundo.z * 0.03) * 0.5 + 0.7;
        float onda = sin(uTempo * 1.7 + noMundo.x * 0.23 + noMundo.z * 0.11) * 0.6
                   + sin(uTempo * 2.9 + noMundo.x * 0.61 - noMundo.z * 0.43) * 0.22;
        noMundo.x += (onda * rajada + 0.25) * kv * ${(0.16 * forca).toFixed(4)};
        noMundo.z += (onda * rajada) * kv * ${(0.07 * forca).toFixed(4)};
        mvPosition = viewMatrix * noMundo;
        gl_Position = projectionMatrix * mvPosition;
        `,
      )
  }
  mat.customProgramCacheKey = () => `vento-${forca}-${altura}-${fixo}`
}
