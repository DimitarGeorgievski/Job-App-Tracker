import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from 'generated/prisma/client';
import { JobType, Role } from 'generated/prisma/enums';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await hash('Admin123!', 8);
  const userPassword = await hash('User123!', 8);
  const companyPassword = await hash('Company123!', 8);
  await prisma.user.upsert({
    where: { email: 'test1@test.com' },
    update: {},
    create: {
      email: 'test1@test.com',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779035201/download_hrtrbd.jpg',
    },
  });
  await prisma.user.upsert({
    where: { email: 'test2@test.com' },
    update: {},
    create: {
      email: 'test2@test.com',
      password: userPassword,
      role: Role.USER,
      firstName: 'Dimitar',
      lastName: 'Georgievski',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779037613/2673030-business-man-serious-and-style-portrait-in-studio-for-corporate-or-ceo-fashion-while-happy.-face-of-asian-entrepreneur-person-on-isolated-white-background-with-pride-for-luxury-success-and-wealth-fit_400_400_jxna4o.jpg',
      skills: ['React', 'NestJS'],
    },
  });
  const companies = [
    {
      email: 'nike@test.com',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779043631/Nike-Logo-500x281_dcebd6.png',
      company: {
        companyName: 'Nike',
        website: 'https://nike.com',
        description: 'Global leader in athletic footwear and apparel.',
        location: 'Beaverton, Oregon',
        industry: 'Fashion & Retail',
      },
    },
    {
      email: 'adidas@test.com',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779043699/Adidas-Logo-500x281_hnrf88.png',
      company: {
        companyName: 'Adidas',
        website: 'https://adidas.com',
        description: 'Multinational sportswear corporation.',
        location: 'Herzogenaurach, Germany',
        industry: 'Fashion & Retail',
      },
    },
    {
      email: 'lv@test.com',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779043766/Louis-Vuitton-logo-500x281_m1mczv.png',
      company: {
        companyName: 'Louis Vuitton',
        website: 'https://louisvuitton.com',
        description: 'French luxury fashion house.',
        location: 'Paris, France',
        industry: 'Luxury & Fashion',
      },
    },
    {
      email: 'ford@test.com',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779044216/Ford-Logo-500x281_vdrgev.png',
      company: {
        companyName: 'Ford',
        website: 'https://ford.com',
        description: 'American multinational automobile manufacturer.',
        location: 'Dearborn, Michigan',
        industry: 'Automotive',
      },
    },
    {
      email: 'mercedes@test.com',
      logoURL:
        'https://res.cloudinary.com/diosuibyw/image/upload/q_auto/f_auto/v1779044242/Mercedes-Benz-Logo-500x311_az1vxp.png',
      company: {
        companyName: 'Mercedes-Benz',
        website: 'https://mercedes-benz.com',
        description: 'German luxury and commercial vehicle manufacturer.',
        location: 'Stuttgart, Germany',
        industry: 'Automotive',
      },
    },
  ];
  const createdCompanies: {
    id: number;
    companyName: string;
    userId: number;
    website: string | null;
    description: string;
    location: string;
    industry: string;
    createdAt: Date;
  }[] = [];
  for (const c of companies) {
    const companyUser = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: companyPassword,
        role: Role.COMPANY,
        logoURL: c.logoURL,
      },
    });

    const company = await prisma.company.upsert({
      where: { userId: companyUser.id },
      update: {},
      create: {
        ...c.company,
        userId: companyUser.id,
      },
    });

    createdCompanies.push(company);
  }
  const [nike, adidas, lv, ford, mercedes] = createdCompanies;
  const jobs = [
    {
      title: 'Senior Frontend Developer',
      description:
        'Build and maintain high-performance web applications using React and TypeScript. Collaborate with design and backend teams to deliver seamless user experiences.',
      location: 'Beaverton, Oregon (Hybrid)',
      jobType: JobType.HYBRID,
      companyId: nike.id,
    },
    {
      title: 'Brand Marketing Manager',
      description:
        'Lead global brand campaigns and drive marketing strategy for our athletic product lines. Work closely with athletes and influencers worldwide.',
      location: 'Beaverton, Oregon (On-site)',
      jobType: JobType.ONSITE,
      companyId: adidas.id,
    },
    {
      title: 'UX/UI Designer',
      description:
        'Design intuitive and beautiful digital experiences for our e-commerce platform. Create wireframes, prototypes, and design systems.',
      location: 'Remote',
      jobType: JobType.REMOTE,
      companyId: lv.id,
    },
    {
      title: 'Software Engineer - Embedded Systems',
      description:
        'Develop firmware and embedded software for next-generation vehicle systems. Work on EV software architecture and real-time operating systems.',
      location: 'Dearborn, Michigan (On-site)',
      jobType: JobType.ONSITE,
      companyId: ford.id,
    },
    {
      title: 'Data Scientist',
      description:
        'Analyze large datasets to extract actionable insights for business decisions. Build predictive models and data pipelines.',
      location: 'Stuttgart, Germany (Hybrid)',
      jobType: JobType.HYBRID,
      companyId: mercedes.id,
    },
    {
      title: 'Product Manager',
      description:
        'Define product vision and roadmap for our digital commerce platform. Work cross-functionally with engineering, design, and marketing.',
      location: 'Remote',
      jobType: JobType.REMOTE,
      companyId: nike.id,
    },
    {
      title: 'Backend Developer - Node.js',
      description:
        'Build scalable REST APIs and microservices. Work with NestJS, PostgreSQL, and Redis to power our global e-commerce infrastructure.',
      location: 'Herzogenaurach, Germany (Hybrid)',
      jobType: JobType.HYBRID,
      companyId: adidas.id,
    },
    {
      title: 'Luxury Retail Sales Associate',
      description:
        'Provide exceptional customer service in our flagship Paris store. Assist clients with product selection and maintain brand standards.',
      location: 'Paris, France (On-site)',
      jobType: JobType.ONSITE,
      companyId: lv.id,
    },
    {
      title: 'DevOps Engineer',
      description:
        'Manage CI/CD pipelines, cloud infrastructure, and deployment processes. Work with AWS, Docker, and Kubernetes.',
      location: 'Remote',
      jobType: JobType.REMOTE,
      companyId: ford.id,
    },
    {
      title: 'Machine Learning Engineer',
      description:
        'Develop AI-powered features for autonomous driving systems. Work with computer vision, neural networks, and real-time data processing.',
      location: 'Stuttgart, Germany (On-site)',
      jobType: JobType.ONSITE,
      companyId: mercedes.id,
    },
  ];
  for (const job of jobs) {
    await prisma.job.upsert({
      where: { companyId: job.companyId },
      update: {},
      create: job,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
