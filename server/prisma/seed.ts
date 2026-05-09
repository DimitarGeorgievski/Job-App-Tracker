import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from 'generated/prisma/client';
import { Role } from 'generated/prisma/enums';
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
    where: {
      email: 'test1@test.com',
    },
    update: {},
    create: {
      email: 'test1@test.com',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });
  await prisma.user.upsert({
    where: {
      email: 'test2@test.com',
    },
    update: {},
    create: {
      email: 'test2@test.com',
      password: userPassword,
      role: Role.USER,
      firstName: 'Dimitar',
      lastName: 'Georgievski',
      skills: ['React', 'NestJS'],
    },
  });
  const companyUser = await prisma.user.upsert({
    where: {
      email: 'test3@test.com',
    },
    update: {},
    create: {
      email: 'test3@test.com',
      password: companyPassword,
      role: Role.COMPANY,
    },
  });
  await prisma.company.upsert({
    where: {
      userId: companyUser.id,
    },
    update: {},
    create: {
      companyName: 'Tech Corp',
      website: 'https://techcorp.com',
      description: 'Software company',
      location: 'Skopje',
      industry: 'IT',
      userId: companyUser.id,
    },
  });
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
