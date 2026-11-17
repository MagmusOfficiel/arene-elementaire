import bpy, sys, math, os
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/k3d_out'
ANIMS = dict(a.split('=') for a in argv[1].split(',')) if len(argv) > 1 else {'idle': 'Unarmed_Idle:4'}
TEX = argv[2] if len(argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
bpy.ops.import_scene.gltf(filepath='adv/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb')
sc = bpy.context.scene
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.name.startswith('Barbarian_') or o.name in ('Barbarian_Hat', 'Barbarian_Round_Shield', 'Barbarian_Cape') or o.type in ('CAMERA', 'LIGHT'):
        bpy.data.objects.remove(o, do_unlink=True)
rig = bpy.data.objects['Rig']
# texture recolorée
if TEX:
    img = bpy.data.images.load(os.path.abspath(TEX))
    for m in bpy.data.materials:
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE': n.image = img; n.interpolation = 'Closest'
# lave : émission sur les zones orange (via le canal rouge de la texture)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    nt = m.node_tree; bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None); tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
    if bsdf and tex:
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tex.outputs['Color'], sep.inputs['Color'])
        ramp = nt.nodes.new('ShaderNodeMath'); ramp.operation = 'GREATER_THAN'; ramp.inputs[1].default_value = 0.85
        nt.links.new(sep.outputs['Red'], ramp.inputs[0])
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 2.5
        nt.links.new(ramp.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], bsdf.inputs['Emission Strength'])
        bsdf.inputs['Roughness'].default_value = 0.8
# cheveux en pointes (rouges), attachés à l'os de la tête
from mathutils import Vector, Matrix, Euler
head = bpy.data.objects['Barbarian_Head']
bb = [Vector(c) for c in head.bound_box]
top = max(v.z for v in bb); cx = sum(v.x for v in bb) / 8; cy = sum(v.y for v in bb) / 8
mat_h = bpy.data.materials.new('Cheveux'); mat_h.diffuse_color = (0.95, 0.12, 0.06, 1)
mat_h.use_nodes = True; mat_h.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.95, 0.12, 0.06, 1)
DOS = float(os.environ.get('DOS', '1'))   # +1 / -1 : sens de « l'arrière » de la tête
pointes = [(0, 0, 0.0, 0.62, 0.30), (0.22, 0.05, 0.35, 0.5, 0.25), (-0.22, 0.05, -0.35, 0.5, 0.25), (0.12, 0.22, 0.25, 0.55, 0.26),
           (-0.12, 0.22, -0.25, 0.55, 0.26), (0, 0.32, 0.0, 0.6, 0.28), (0.3, 0.2, 0.6, 0.42, 0.22), (-0.3, 0.2, -0.6, 0.42, 0.22), (0, -0.18, 0.0, 0.4, 0.26)]
for i, (dx, dy, tilt, L, r) in enumerate(pointes):
    me = bpy.data.meshes.new(f'p{i}'); o = bpy.data.objects.new(f'Pointe{i}', me); sc.collection.objects.link(o)
    import bmesh; bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=0, depth=L); bm.to_mesh(me); bm.free()
    me.materials.append(mat_h)
    o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = 'head'
    o.matrix_world = Matrix.Translation((cx + dx, cy + DOS * dy, top - 0.12 + L * 0.35)) @ Euler((DOS * (0.55 + dy * 1.2), tilt, 0)).to_matrix().to_4x4()
# caméra orthographique, vue de 3/4 tournée vers la droite
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 3.4
cam.location = (6.0, -6.0, 2.6); cam.rotation_euler = (math.radians(78), 0, math.radians(45))
cam.data.shift_y = 0.0
rig.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', '75'))))
# éclairage : clé chaude + contre-jour orange + ambiance
def lum(nom, typ, loc, rot, e, col):
    l = bpy.data.objects.new(nom, bpy.data.lights.new(nom, typ)); l.data.energy = e; l.data.color = col; l.location = loc; l.rotation_euler = rot; sc.collection.objects.link(l)
lum('Cle', 'SUN', (4, -4, 6), (math.radians(45), 0, math.radians(30)), 3.2, (1, 0.95, 0.9))
lum('Contre', 'SUN', (-4, 4, 3), (math.radians(-60), 0, math.radians(200)), 2.5, (1, 0.45, 0.15))
sc.world = bpy.data.worlds.new('W'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
# rendu : Workbench (aplats nets, contour, sans bruit) -> look cartoon
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_object_outline = True; sh.object_outline_color = (0.06, 0.03, 0.03)
sh.show_cavity = True; sh.cavity_type = 'WORLD'; sh.show_shadows = True; sh.shadow_intensity = 0.35
sc.display.render_aa = '8'
sc.render.resolution_x = sc.render.resolution_y = 320; sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
for nom, spec in ANIMS.items():
    act, n = spec.split(':'); n = int(n)
    a = bpy.data.actions[act]; rig.animation_data_create(); rig.animation_data.action = a
    try: rig.animation_data.action_slot = a.slots[0]
    except Exception: pass
    f0, f1 = a.frame_range
    for i in range(n):
        sc.frame_set(int(round(f0 + (f1 - f0) * i / n)))
        sc.render.filepath = f'{OUT}/{nom}_{i}.png'; bpy.ops.render.render(write_still=True)
print('FINI')
