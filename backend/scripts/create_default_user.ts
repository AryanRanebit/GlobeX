import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('GlobeX@2026', 12);
  const user = await prisma.user.upsert({
    where: { email: 'aryan@globex.ai' },
    update: { password: hash },
    create: {
      name: 'Aryan Rane',
      email: 'aryan@globex.ai',
      password: hash,
      role: Role.ADMIN,
      companyName: 'GlobeX International Exports',
      companyType: 'Exporter',
      industry: 'International Trade & AI',
      isVerified: true
    }
  });

  // Link sample product if none exists
  const existingProduct = await prisma.product.findFirst({
    where: { userId: user.id }
  });

  if (!existingProduct) {
    await prisma.product.create({
      data: {
        userId: user.id,
        productName: 'Organic Basmati Rice',
        category: 'Agri & Food Commodities',
        description: 'Export-grade long grain aromatic basmati rice (Pusa 1121). Moisture < 12.5%, FSSAI and APEDA certified.',
        hsCode: '1006.30',
        targetCountries: ['US', 'AE', 'GB', 'SA', 'DE'],
        unitPrice: 1.25,
        currency: 'USD',
        certifications: ['APEDA', 'FSSAI', 'ISO 22000', 'BRCGS']
      }
    });
  }

  console.log('✅ Default account ready!');
  console.log('Email:', user.email);
  console.log('Name:', user.name);
  console.log('Role:', user.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
