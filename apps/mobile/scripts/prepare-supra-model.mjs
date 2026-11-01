#!/usr/bin/env node
/**
 * Builds assets/models/honda_supra_x_125_fi_v1.glb from the Sketchfab source model
 * "Honda Supra x 125" by boiledfish.vvti (CC BY 4.0):
 * https://sketchfab.com/3d-models/honda-supra-x-125-6d61abb3aa3a4161bda31ef783111015
 *
 * Steps (docs/3D-VIEWER.md):
 *   1. Normalize axes: source is Y-up facing -Z with the ground at y = -0.445;
 *      output faces +X, +Z is the rider's right, wheels touch y = 0.
 *   2. Rename nodes: wheels, forks, swingarm become part__<code>, everything else body__<name>.
 *   3. Add hotspot spheres (part__<code>__hs) for parts that have no mesh of their own.
 *   4. Validate that every catalog part is reachable.
 *
 * Run from apps/mobile:  node scripts/prepare-supra-model.mjs /path/to/honda_supra_x_125.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/functions';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARTS,
  SUPRA_X_125_ANCHORS,
  SUPRA_X_125_EXTRA_HOTSPOTS,
  SUPRA_X_125_MESH_PARTS,
  partCodeFromNodeName,
} from '@prime-garage/shared';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/prepare-supra-model.mjs <source.glb>');
  process.exit(1);
}
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/models/honda_supra_x_125_fi_v1.glb');

const io = new NodeIO();
const doc = await io.read(source);
const root = doc.getRoot();
const scene = root.listScenes()[0];

// 1. Axes: rotate -90 degrees around Y (source -Z becomes +X), then lift to the ground and center the wheelbase.
const model = doc.createNode('source_model').setRotation([0, -Math.SQRT1_2, 0, Math.SQRT1_2]).setTranslation([-0.104, 0.445, 0]);
for (const child of scene.listChildren()) {
  scene.removeChild(child);
  model.addChild(child);
}
const top = doc.createNode('honda_supra_x_125_fi_v1').addChild(model);
scene.addChild(top);

// 2. Node names
const renames = {
  ...Object.fromEntries(Object.entries(SUPRA_X_125_MESH_PARTS).map(([from, code]) => [from, `part__${code}`])),
  chassis: 'body__chassis',
  mudguard: 'body__front_fender',
  handlebars: 'body__handlebars',
};
for (const node of root.listNodes()) {
  const next = renames[node.getName()];
  if (next) node.setName(next);
}

// 3. Hotspot spheres
function sphere(radius, widthSegments = 16, heightSegments = 10) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const nx = -Math.cos(u * 2 * Math.PI) * Math.sin(v * Math.PI);
      const ny = Math.cos(v * Math.PI);
      const nz = Math.sin(u * 2 * Math.PI) * Math.sin(v * Math.PI);
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
    }
  }
  const row = widthSegments + 1;
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * row + x;
      const b = a + row;
      if (y !== 0) indices.push(a, b, a + 1);
      if (y !== heightSegments - 1) indices.push(b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

const buffer = root.listBuffers()[0];
const geo = sphere(0.02);
const hotspotMaterial = doc
  .createMaterial('hotspot')
  .setBaseColorFactor([0.05, 0.65, 0.91, 0.9])
  .setEmissiveFactor([0.05, 0.55, 0.85])
  .setAlphaMode('BLEND')
  .setMetallicFactor(0)
  .setRoughnessFactor(0.4);
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor('hotspot_pos').setType('VEC3').setArray(geo.positions).setBuffer(buffer))
  .setAttribute('NORMAL', doc.createAccessor('hotspot_nrm').setType('VEC3').setArray(geo.normals).setBuffer(buffer))
  .setIndices(doc.createAccessor('hotspot_idx').setType('SCALAR').setArray(geo.indices).setBuffer(buffer))
  .setMaterial(hotspotMaterial);
const hotspotMesh = doc.createMesh('hotspot').addPrimitive(prim);

const meshParts = new Set(Object.values(SUPRA_X_125_MESH_PARTS));
const hotspots = [
  ...Object.entries(SUPRA_X_125_ANCHORS)
    .filter(([code]) => !meshParts.has(code))
    .map(([code, position]) => ({ name: `part__${code}__hs`, position })),
  ...SUPRA_X_125_EXTRA_HOTSPOTS.map((h, i) => ({ name: `part__${h.partCode}__hs${i + 2}`, position: h.position })),
];
for (const h of hotspots) top.addChild(doc.createNode(h.name).setMesh(hotspotMesh).setTranslation(h.position));

// 4. Validation
const reachable = new Set();
for (const node of root.listNodes()) {
  const code = partCodeFromNodeName(node.getName());
  if (code) reachable.add(code);
}
const known = new Set(PARTS.map((p) => p.code));
for (const code of reachable) if (!known.has(code)) throw new Error(`Unknown part code in model: ${code}`);
const missing = [...known].filter((c) => !reachable.has(c));
if (missing.length) throw new Error(`Parts not reachable in the model: ${missing.join(', ')}`);

const bounds = getBounds(scene);
const fmt = (v) => v.map((n) => n.toFixed(3)).join(', ');
console.log(`Bounds min [${fmt(bounds.min)}] max [${fmt(bounds.max)}]`);
if (Math.abs(bounds.min[1]) > 0.01) throw new Error('Wheels do not touch y = 0');

await io.write(OUT, doc);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} with ${hotspots.length} hotspots, ${reachable.size} reachable parts`);
