/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GlobeX AI database...');

  // ─── Admin User ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@globex.ai' },
    update: {},
    create: {
      name: 'GlobeX Admin',
      email: 'admin@globex.ai',
      password: adminPassword,
      role: Role.ADMIN,
      companyName: 'GlobeX AI',
      companyType: 'Technology',
      industry: 'Software',
      isVerified: true,
    },
  });

  // ─── Demo User ───────────────────────────────────────────────
  const userPassword = await bcrypt.hash('Demo@123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@spicesexport.in' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'demo@spicesexport.in',
      password: userPassword,
      role: Role.USER,
      companyName: 'Kumar Spices Pvt Ltd',
      companyType: 'Manufacturer',
      industry: 'Food & Spices',
      isVerified: true,
    },
  });

  // ─── Products ────────────────────────────────────────────────
  const product1 = await prisma.product.create({
    data: {
      userId: demoUser.id,
      productName: 'Organic Turmeric Powder',
      category: 'Spices',
      description: 'Premium quality organic turmeric sourced from Erode, Tamil Nadu. Curcumin content >3.5%. FSSAI certified, suitable for export.',
      hsCode: '0910.30',
      targetCountries: ['US', 'DE', 'GB', 'AU', 'AE'],
      unitPrice: 4.5,
      currency: 'USD',
      certifications: ['FSSAI', 'USDA Organic', 'ISO 22000'],
    },
  });

  // ─── Buyers & Leads ──────────────────────────────────────────
  // No buyers are seeded. Fabricated companies with invented websites, emails,
  // revenues and "verified" flags previously shipped here; they violated the
  // project's evidence standard. Real buyer records are created only by the
  // grounded discovery pipeline (POST /api/v1/buyers/discover), which persists
  // citation-backed companies with provenance and honest verification states.
  // Leads are created from those real buyer records.

  // ─── Compliance Requirements ─────────────────────────────────
  const complianceData = [
    // USA
    { country: 'United States', countryCode: 'US', documentName: 'FDA Registration', description: 'All food facilities exporting to the US must be registered with the FDA under the Bioterrorism Act.', category: 'Registration', authority: 'U.S. Food & Drug Administration', processingTime: '1–2 weeks', estimatedCost: 'Free' },
    { country: 'United States', countryCode: 'US', documentName: 'Export License', description: 'Required for certain controlled goods. For food items, check USDA APHIS requirements.', category: 'Licensing', authority: 'USDA / BIS', processingTime: '2–4 weeks', estimatedCost: '$500–$1,000' },
    { country: 'United States', countryCode: 'US', documentName: 'Product Label Compliance', description: 'Labels must comply with FDA labeling requirements including nutritional facts, allergens, and country of origin.', category: 'Labeling', authority: 'FDA', processingTime: '1–3 weeks', estimatedCost: '$200–$800' },
    // Germany
    { country: 'Germany', countryCode: 'DE', documentName: 'EU Health Certificate', description: 'Products entering the EU must have a health certificate issued by the exporting country\'s competent authority.', category: 'Certification', authority: 'APEDA / FSSAI', processingTime: '2–3 weeks', estimatedCost: '₹5,000–₹15,000' },
    { country: 'Germany', countryCode: 'DE', documentName: 'CE Marking (if applicable)', description: 'CE marking required for specific product categories entering European markets.', category: 'Certification', authority: 'European Commission', processingTime: '4–12 weeks', estimatedCost: '$2,000–$10,000' },
    { country: 'Germany', countryCode: 'DE', documentName: 'GDPR-compliant Business Registration', description: 'Business communications must comply with GDPR for any digital outreach or data storage.', category: 'Legal', authority: 'German Data Protection Authority', processingTime: 'N/A', estimatedCost: 'N/A' },
    // UAE
    { country: 'United Arab Emirates', countryCode: 'AE', documentName: 'Halal Certification', description: 'Food products must have Halal certification from an approved certifying body for UAE market entry.', category: 'Certification', authority: 'ESMA / ADQCC', processingTime: '4–8 weeks', estimatedCost: '$500–$2,000' },
    { country: 'United Arab Emirates', countryCode: 'AE', documentName: 'Emirates Conformity Assessment (ECAS)', description: 'Certain products require ECAS certification before entering the UAE market.', category: 'Certification', authority: 'ESMA', processingTime: '6–12 weeks', estimatedCost: '$1,000–$5,000' },
  ];

  await prisma.compliance.createMany({ data: complianceData });

  // ─── Opportunities ───────────────────────────────────────────
  // No opportunities are seeded. Invented demand scores (91/88/76) and growth
  // rates ("18%"/"22%") previously shipped here and rendered as real-looking
  // numbers in the demo dashboard; they violated the project's evidence
  // standard. Real opportunities are created only by the market research
  // pipeline (POST /api/v1/market/analyze), and demand scores from official
  // Comtrade trade flows come from /api/v1/trade/markets. Until then the demo
  // dashboard honestly shows that no analysis has been run yet.

  console.log('✅ Seed complete!');
  console.log('\n📧 Demo credentials:');
  console.log('   Admin  → admin@globex.ai / Admin@123');
  console.log('   User   → demo@spicesexport.in / Demo@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
