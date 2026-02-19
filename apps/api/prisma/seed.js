require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const users = [
  {
    email: 'mario@home.local',
    password: 'Mario1234!',
    displayName: 'Mario',
    avatar: '🐱'
  },
  {
    email: 'aye@home.local',
    password: 'Aye1234!',
    displayName: 'Ayelén',
    avatar: '🐈‍⬛'
  }
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        displayName: user.displayName,
        avatar: user.avatar
      },
      create: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });

    await prisma.settings.upsert({
      where: { userId: savedUser.id },
      update: {
        currency: 'USD'
      },
      create: {
        userId: savedUser.id,
        salaryMonthly: 0,
        currency: 'USD'
      }
    });
  }

  await prisma.householdSettings.upsert({
    where: { id: 1 },
    update: {
      householdSavingsGoalMonthly: 0,
      currency: 'USD'
    },
    create: {
      id: 1,
      householdSavingsGoalMonthly: 0,
      currency: 'USD'
    }
  });

  console.log('Seed complete: Mario + Ayelén + household settings created.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
