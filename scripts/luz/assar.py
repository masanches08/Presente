# Passo 2 da luz assada: o Blender calcula a luz de verdade dentro da casa.
# Uso: blender --background --factory-startup --python scripts/luz/assar.py -- <resolucao> <amostras>
# Lê .luz/cena.json + cena.bin (do exportar.ts) e grava, pra cada andar:
#   .luz/<andar>.f32  (a luz em float, RGBA, de baixo pra cima)
#   .luz/uv.bin       (as coordenadas de cada vértice no mapa de luz, na mesma ordem do site)
import bpy
import bmesh
import json
import math
import os
import sys
import time

import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RES = int(args[0]) if len(args) > 0 else 2048
AMOSTRAS = int(args[1]) if len(args) > 1 else 256
# "ao" = também assa a oclusão (sombrinha nos cantos e embaixo dos móveis), salva em <andar>.ao.f32
COM_AO = len(args) > 2 and args[2] == 'ao'
PASTA = os.path.abspath('.luz')
t0 = time.time()


def log(*a):
    print(f'[{time.time() - t0:6.1f}s]', *a, flush=True)


cfg = json.load(open(os.path.join(PASTA, 'cena.json'), encoding='utf-8'))
V = cfg['vertices']
dados = np.fromfile(os.path.join(PASTA, 'cena.bin'), dtype=np.float32)


def para_blender(a):
    """three.js (y pra cima) → Blender (z pra cima): (x, y, z) → (x, -z, y)"""
    a = a.reshape(-1, 3)
    return np.stack([a[:, 0], -a[:, 2], a[:, 1]], axis=1).astype(np.float32)


POS = para_blender(dados[: V * 3])
NOR = para_blender(dados[V * 3: V * 6])


def srgb_lin(h):
    c = [int(h[i: i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


# ---------------- cena ----------------
cena = bpy.context.scene
cena.render.engine = 'CYCLES'
cena.cycles.device = 'CPU'
cena.cycles.samples = AMOSTRAS
cena.cycles.use_denoising = False
cena.cycles.max_bounces = 6
cena.cycles.diffuse_bounces = 4
cena.cycles.glossy_bounces = 1
cena.cycles.transmission_bounces = 0
cena.cycles.transparent_max_bounces = 2
cena.cycles.sample_clamp_indirect = 8.0  # corta os "vaga-lumes" (pontinhos estourados)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)


def material(nome, cor, emissao=None):
    m = bpy.data.materials.new(nome)
    try:
        m.use_nodes = True
    except Exception:
        pass
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*srgb_lin(cor), 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    if emissao:
        bsdf.inputs['Emission Color'].default_value = (*srgb_lin(emissao['cor']), 1)
        bsdf.inputs['Emission Strength'].default_value = emissao['forca']
    return m


def criar_objeto(p):
    o, n = p['offset'], p['count']
    me = bpy.data.meshes.new(p['nome'])
    me.vertices.add(n)
    me.vertices.foreach_set('co', POS[o: o + n].ravel())
    me.loops.add(n)
    me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32))
    me.polygons.add(n // 3)
    me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
    me.update(calc_edges=True)
    ob = bpy.data.objects.new(p['nome'], me)
    cena.collection.objects.link(ob)
    ob.data.materials.append(material(p['nome'], p['cor'], p.get('emissao')))
    return ob


def preparar_para_assar(ob, p):
    """Junta os vértices soltos (pra desembrulhar bonito) sem perder a ordem original, e cria o mapa 'luz'"""
    me = ob.data
    n = p['count']
    orig = me.attributes.new('orig', 'INT', 'CORNER')
    orig.data.foreach_set('value', np.arange(n, dtype=np.int32))
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(me)
    bm.free()
    # normais iguaizinhas às do site (luz certa nas coisas arredondadas)
    L = len(me.loops)
    idx = np.empty(L, dtype=np.int32)
    me.attributes['orig'].data.foreach_get('value', idx)
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool))
    normais = NOR[p['offset'] + idx]
    me.normals_split_custom_set([tuple(v) for v in normais])
    uv = me.uv_layers.new(name='luz')
    me.uv_layers.active = uv


# ---------------- monta tudo ----------------
objs = {}
for p in cfg['pecas']:
    ob = criar_objeto(p)
    objs[p['nome']] = (ob, p)
log('objetos criados:', len(objs))

# chão do lote (grama) pra luz rebater
bpy.ops.mesh.primitive_plane_add(size=240, location=(0, 0, -0.04))
chao = bpy.context.active_object
chao.data.materials.append(material('chao', '#5E8A3C'))

# céu de verdade (sem o sol do HDRI: o sol é a lâmpada abaixo, na mesma direção do site)
mundo = bpy.data.worlds.new('ceu')
cena.world = mundo
try:
    mundo.use_nodes = True
except Exception:
    pass
nt = mundo.node_tree
fundo = next(n for n in nt.nodes if n.type == 'BACKGROUND')
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(PASTA, 'tarde_2k.hdr'))
corte = nt.nodes.new('ShaderNodeVectorMath')
corte.operation = 'MINIMUM'
corte.inputs[1].default_value = (4.0, 4.0, 4.0)
nt.links.new(env.outputs['Color'], corte.inputs[0])
nt.links.new(corte.outputs[0], fundo.inputs['Color'])
fundo.inputs['Strength'].default_value = 3.2

sol = bpy.data.lights.new('sol', 'SUN')
sol.energy = 3.5
sol.color = srgb_lin('#FFEBD0')
sol.angle = math.radians(1.2)
sol_ob = bpy.data.objects.new('sol', sol)
cena.collection.objects.link(sol_ob)
d = Vector(para_blender(np.array(cfg['sol'], dtype=np.float32))[0])
sol_ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()

def ocupacao(obs):
    """quanto do quadrado do mapa as peças ocupam (só pra conferir)"""
    tot = 0.0
    for ob in obs:
        me = ob.data
        uv = np.empty(len(me.loops) * 2, dtype=np.float32)
        me.uv_layers['luz'].data.foreach_get('uv', uv)
        uv = uv.reshape(-1, 3, 2) if len(me.loops) % 3 == 0 else None
        if uv is None:
            continue
        a = uv[:, 1] - uv[:, 0]
        b = uv[:, 2] - uv[:, 0]
        tot += np.abs(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]).sum() / 2
    return tot


# ---------------- assa andar por andar ----------------
uv_saida = {}
for andar in cfg['andares']:
    alvo = [(ob, p) for ob, p in objs.values() if p['andar'] == andar and p['papel'] == 'assar']
    if not alvo:
        continue
    for ob, p in alvo:
        preparar_para_assar(ob, p)
    log(andar, 'preparado', len(alvo), 'peças')

    # desembrulha todas as peças do andar num mapa só
    bpy.ops.object.select_all(action='DESELECT')
    for ob, _ in alvo:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = alvo[0][0]
    # (sem a janela de UV aberta: a seleção de UV segue a da malha)
    cena.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    r1 = bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    r2 = bpy.ops.uv.average_islands_scale()
    r3 = bpy.ops.uv.pack_islands(rotate=True, rotate_method='AXIS_ALIGNED', margin_method='FRACTION', margin=3 / RES, shape_method='AABB')
    bpy.ops.object.mode_set(mode='OBJECT')
    log(andar, 'desembrulhado', r1, r2, r3, 'ocupação %.0f%%' % (100 * ocupacao([ob for ob, _ in alvo])))

    img = bpy.data.images.new(f'luz_{andar}', RES, RES, alpha=True, float_buffer=True)
    for ob, _ in alvo:
        for m in ob.data.materials:
            no = m.node_tree.nodes.new('ShaderNodeTexImage')
            no.image = img
            m.node_tree.nodes.active = no
    cena.render.bake.margin = 6
    cena.render.bake.margin_type = 'EXTEND'
    cena.render.bake.use_clear = True
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, use_clear=True)
    log(andar, 'assado')

    px = np.empty(RES * RES * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px.tofile(os.path.join(PASTA, f'{andar}.f32'))

    if COM_AO:
        cena.world.light_settings.distance = 0.9  # só os cantinhos (até 90 cm)
        amostras_luz = cena.cycles.samples
        cena.cycles.samples = max(32, AMOSTRAS // 2)
        bpy.ops.object.bake(type='AO', margin=6, use_clear=True)
        cena.cycles.samples = amostras_luz
        img.pixels.foreach_get(px)
        px.tofile(os.path.join(PASTA, f'{andar}.ao.f32'))
        log(andar, 'oclusão assada')

    for ob, p in alvo:
        me = ob.data
        L = len(me.loops)
        uv = np.empty(L * 2, dtype=np.float32)
        me.uv_layers['luz'].data.foreach_get('uv', uv)
        idx = np.empty(L, dtype=np.int32)
        me.attributes['orig'].data.foreach_get('value', idx)
        saida = np.zeros((p['count'], 2), dtype=np.float32)
        saida[idx] = uv.reshape(-1, 2)
        uv_saida[p['nome']] = saida

# as coordenadas, na ordem das peças do cena.json
ordem = [p['nome'] for p in cfg['pecas'] if p['papel'] == 'assar']
np.concatenate([uv_saida[n] for n in ordem]).astype(np.float32).tofile(os.path.join(PASTA, 'uv.bin'))
json.dump({'resolucao': RES, 'amostras': AMOSTRAS, 'ordem': ordem}, open(os.path.join(PASTA, 'assado.json'), 'w'))
log('pronto')
