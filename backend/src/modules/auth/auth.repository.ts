import { prisma } from '../../config/database';

export const authRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  // Matches rows stored before emails were lowercased on the way in, so
  // those accounts keep working instead of becoming unreachable duplicates.
  findByEmailInsensitive: (email: string) =>
    prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),

  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        companyName: true, companyType: true, industry: true,
        isVerified: true, isActive: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
      },
    }),

  create: (data: {
    name: string; email: string; password: string;
    companyName: string; companyType: string; industry: string;
  }) => prisma.user.create({ data }),

  updateRefreshToken: (userId: string, refreshToken: string | null) =>
    prisma.user.update({ where: { id: userId }, data: { refreshToken, lastLoginAt: new Date() } }),

  updateProfile: (userId: string, data: { name?: string; companyName?: string; companyType?: string; industry?: string }) =>
    prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        companyName: true, companyType: true, industry: true,
        createdAt: true, updatedAt: true,
      },
    }),
};
