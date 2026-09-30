# Passo 2b da luz assada: tira o chuvisco (ruído) do mapa de luz com o denoiser do Blender (OpenImageDenoise).
# Uso: blender --background --factory-startup --python scripts/luz/limpar.py
# Lê .luz/<andar>.f32 e grava .luz/<andar>.limpo.f32
import bpy
import json
import os

import numpy as np

PASTA = os.path.abspath('.luz')
cfg = json.load(open(os.path.join(PASTA, 'assado.json'), encoding='utf-8'))
RES = cfg['resolucao']
andares = json.load(open(os.path.join(PASTA, 'cena.json'), encoding='utf-8'))['andares']


def de_srgb(x):
    # a saída do compositor vem "pronta pra tela" (sRGB): volta pra luz linear
    x = np.maximum(x, 0)
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


cena = bpy.data.scenes.new('limpar')
cena.render.resolution_x = RES
cena.render.resolution_y = RES
cena.render.resolution_percentage = 100
cena.render.engine = 'BLENDER_WORKBENCH'
cena.render.use_compositing = True
cena.render.image_settings.file_format = 'OPEN_EXR'
cena.render.image_settings.color_depth = '32'

for andar in andares:
    arq = os.path.join(PASTA, f'{andar}.f32')
    if not os.path.exists(arq):
        continue
    px = np.fromfile(arq, dtype=np.float32)
    tmp = bpy.data.images.new(f'entrada_{andar}', RES, RES, alpha=True, float_buffer=True)
    tmp.pixels.foreach_set(px)
    tmp.filepath_raw = os.path.join(PASTA, f'_entrada_{andar}.exr')
    tmp.file_format = 'OPEN_EXR'
    tmp.save()
    img = bpy.data.images.load(tmp.filepath_raw)

    ng = bpy.data.node_groups.new(f'limpar_{andar}', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    ni = ng.nodes.new('CompositorNodeImage')
    ni.image = img
    nd = ng.nodes.new('CompositorNodeDenoise')
    nd.inputs['HDR'].default_value = True
    no = ng.nodes.new('NodeGroupOutput')
    ng.links.new(ni.outputs['Image'], nd.inputs['Image'])
    ng.links.new(nd.outputs['Image'], no.inputs[0])
    cena.compositing_node_group = ng
    cena.render.filepath = os.path.join(PASTA, f'_limpo_{andar}.exr')
    bpy.ops.render.render(write_still=True, scene=cena.name)

    out = bpy.data.images.load(cena.render.filepath)
    o = np.empty(RES * RES * 4, dtype=np.float32)
    out.pixels.foreach_get(o)
    o = o.reshape(-1, 4)
    o[:, :3] = de_srgb(o[:, :3])
    o[:, 3] = px.reshape(-1, 4)[:, 3]  # a máscara das ilhas continua a original
    o.astype(np.float32).tofile(os.path.join(PASTA, f'{andar}.limpo.f32'))
    for f in (tmp.filepath_raw, cena.render.filepath):
        os.remove(f)
    print('limpo', andar, flush=True)
