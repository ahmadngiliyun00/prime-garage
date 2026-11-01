import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import {
  MODEL_3D_ASSETS,
  type BrandDto,
  type Model3dDto,
  type PartDto,
  type PartGroup,
  type PartView,
  type Vec3,
  type VehicleCategory,
  type VehicleModelDto,
} from '@prime-garage/shared';
import { Public } from '../../common/decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Public reference data: brands, models, parts (education content), and 3D part views. */
@Controller('catalog')
@Public()
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('brands')
  async brands(): Promise<BrandDto[]> {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('models')
  async models(@Query('brandId') brandId?: string, @Query('q') q?: string): Promise<VehicleModelDto[]> {
    const rows = await this.prisma.vehicleModel.findMany({
      where: {
        isActive: true,
        ...(brandId ? { brandId: Number(brandId) } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: { brand: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      brandId: m.brandId,
      brandName: m.brand.name,
      name: m.name,
      slug: m.slug,
      kind: m.kind,
      category: m.category as VehicleCategory,
      engineCc: m.engineCc,
      model3dKey: m.model3dKey,
      yearStart: m.yearStart,
      yearEnd: m.yearEnd,
    }));
  }

  @Get('parts')
  async parts(): Promise<PartDto[]> {
    const rows = await this.prisma.part.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((p) => ({
      code: p.code,
      name: p.name,
      nameEn: p.nameEn,
      group: p.partGroup as PartGroup,
      appliesTo: p.appliesTo as VehicleCategory[],
      summary: p.summary,
      functionText: p.functionText,
      symptomsText: p.symptomsText,
      careTipsText: p.careTipsText,
      tourOrder: p.tourOrder,
      sortOrder: p.sortOrder,
    }));
  }

  @Get('models3d/:key')
  async model3d(@Param('key') key: string): Promise<Model3dDto> {
    const asset = await this.prisma.model3dAsset.findUnique({ where: { key }, include: { partViews: true } });
    if (!asset) throw new NotFoundException('Model 3D tidak ditemukan');
    const registry = MODEL_3D_ASSETS.find((m) => m.key === key);
    const partViews: PartView[] = asset.partViews.map((v) => ({
      partCode: v.partCode,
      cameraPosition: v.cameraPosition as Vec3,
      cameraTarget: v.cameraTarget as Vec3,
      labelAnchor: (v.labelAnchor as Vec3 | null) ?? (v.cameraTarget as Vec3),
    }));
    return {
      key: asset.key,
      category: asset.category as VehicleCategory,
      version: asset.version,
      defaultCamera: registry?.defaultCamera ?? { position: [2, 1.2, 2.2], target: [0, 0.5, 0] },
      partViews,
    };
  }
}
