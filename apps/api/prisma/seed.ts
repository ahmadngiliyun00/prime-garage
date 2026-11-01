/**
 * Idempotent catalog seed: brands, vehicle models, 3D assets, parts (education content),
 * per-part camera views, and default maintenance rule templates. Safe to re-run.
 */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  BRANDS,
  MODEL_3D_ASSETS,
  PARTS,
  PART_VIEWS_BY_MODEL,
  RULE_TEMPLATES,
  VEHICLE_MODELS,
} from '@prime-garage/shared';
import { PrismaClient } from '../src/generated/prisma/client.js';

const url = new URL(process.env['DATABASE_URL'] ?? '');
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
    timezone: 'Z',
  }),
});

async function main(): Promise<void> {
  for (const b of BRANDS) {
    await prisma.brand.upsert({ where: { slug: b.slug }, create: b, update: { name: b.name } });
  }

  for (const m of MODEL_3D_ASSETS) {
    const data = { category: m.category, filePath: m.filePath, version: m.version, licenseNote: m.licenseNote, isActive: true };
    await prisma.model3dAsset.upsert({ where: { key: m.key }, create: { key: m.key, ...data }, update: data });
  }

  for (const p of PARTS) {
    const data = {
      name: p.name,
      nameEn: p.nameEn,
      partGroup: p.group,
      appliesTo: p.appliesTo,
      summary: p.summary,
      functionText: p.functionText,
      symptomsText: p.symptomsText,
      careTipsText: p.careTipsText,
      tourOrder: p.tourOrder,
      sortOrder: p.sortOrder,
    };
    await prisma.part.upsert({ where: { code: p.code }, create: { code: p.code, ...data }, update: data });
  }

  for (const [model3dKey, views] of Object.entries(PART_VIEWS_BY_MODEL)) {
    for (const v of views) {
      const data = { cameraPosition: v.cameraPosition, cameraTarget: v.cameraTarget, labelAnchor: v.labelAnchor };
      await prisma.model3dPartView.upsert({
        where: { model3dKey_partCode: { model3dKey, partCode: v.partCode } },
        create: { model3dKey, partCode: v.partCode, ...data },
        update: data,
      });
    }
  }

  const brands = new Map((await prisma.brand.findMany()).map((b) => [b.slug, b.id]));
  for (const m of VEHICLE_MODELS) {
    const brandId = brands.get(m.brandSlug);
    if (!brandId) throw new Error(`Unknown brand ${m.brandSlug}`);
    const data = {
      brandId,
      name: m.name,
      kind: m.kind,
      category: m.category,
      engineCc: m.engineCc,
      fuelSystem: m.fuelSystem,
      transmission: m.transmission,
      finalDrive: m.finalDrive,
      yearStart: m.yearStart,
      yearEnd: m.yearEnd,
      model3dKey: m.model3dKey,
      specs: m.specs,
      isActive: true,
    };
    await prisma.vehicleModel.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
  }

  // Category templates are replaced as a whole so removed rows disappear; vehicles keep their own copies.
  const categories = [...new Set(RULE_TEMPLATES.map((t) => t.category))];
  for (const category of categories) {
    const existing = await prisma.maintenanceRuleTemplate.findMany({ where: { category, vehicleModelId: null } });
    for (const t of RULE_TEMPLATES.filter((r) => r.category === category)) {
      const match = existing.find((e) => e.partCode === t.partCode && e.action === t.action);
      const data = {
        intervalKm: t.intervalKm,
        intervalMonths: t.intervalMonths,
        resetActions: t.resetActions,
        sourceNote: t.sourceNote,
      };
      if (match) await prisma.maintenanceRuleTemplate.update({ where: { id: match.id }, data });
      else await prisma.maintenanceRuleTemplate.create({ data: { partCode: t.partCode, action: t.action, category, ...data } });
    }
  }

  const counts = {
    brands: await prisma.brand.count(),
    models: await prisma.vehicleModel.count(),
    parts: await prisma.part.count(),
    partViews: await prisma.model3dPartView.count(),
    ruleTemplates: await prisma.maintenanceRuleTemplate.count(),
  };
  console.log('Seed complete', counts);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
