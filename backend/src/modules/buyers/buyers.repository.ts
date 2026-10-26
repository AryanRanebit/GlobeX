import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';

export const buyersRepository = {
  search: async (params: {
    q?: string; country?: string; industry?: string; minLeadScore?: number;
    skip: number; take: number; orderBy: Record<string, string>;
  }) => {
    const where: {
      OR?: object[]; countryCode?: string;
      industry?: { contains: string; mode: 'insensitive' };
      leadScore?: { gte: number };
    } = {
      ...(params.q && { OR: [
        { companyName: { contains: params.q, mode: 'insensitive' } },
        { industry: { contains: params.q, mode: 'insensitive' } },
        { country: { contains: params.q, mode: 'insensitive' } },
      ]}),
      ...(params.country && { countryCode: params.country.toUpperCase() }),
      ...(params.industry && { industry: { contains: params.industry, mode: 'insensitive' } }),
      ...(params.minLeadScore && { leadScore: { gte: params.minLeadScore } }),
    };
    const [buyers, total] = await prisma.$transaction([
      prisma.buyer.findMany({ where, skip: params.skip, take: params.take, orderBy: params.orderBy }),
      prisma.buyer.count({ where }),
    ]);
    return { buyers, total };
  },

  findById: (id: string) =>
    prisma.buyer.findUnique({
      where: { id },
      include: {
        leads: { select: { id: true, status: true, leadScore: true, createdAt: true } },
        _count: { select: { outreaches: true } },
      },
    }),

  create: (data: any) => prisma.buyer.create({ data }),

  /** Phase 7: Create a buyer with full provenance and evidence fields. */
  createWithProvenance: (data: {
    companyName: string;
    country: string;
    countryCode: string;
    industry: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    annualRevenue?: string | null;
    employeeCount?: string | null;
    importVolume?: string | null;
    leadScore: number;
    isVerified: boolean;
    sourceProvider: string;
    sourceUrl: string;
    providerReference?: string | null;
    verificationStatus: string;
    verificationEvidence: Prisma.InputJsonValue;
  }) =>
    prisma.buyer.create({
      data: {
        companyName: data.companyName,
        country: data.country,
        countryCode: data.countryCode,
        industry: data.industry,
        website: data.website ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        annualRevenue: data.annualRevenue ?? undefined,
        employeeCount: data.employeeCount ?? undefined,
        importVolume: data.importVolume ?? undefined,
        leadScore: data.leadScore,
        isVerified: data.isVerified,
        sourceProvider: data.sourceProvider,
        sourceUrl: data.sourceUrl,
        providerReference: data.providerReference ?? undefined,
        verificationStatus: data.verificationStatus,
        verificationEvidence: data.verificationEvidence,
      },
    }),

  count: () => prisma.buyer.count(),
};
