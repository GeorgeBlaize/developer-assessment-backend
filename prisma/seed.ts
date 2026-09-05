import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const [freePlan, basicPlan, proPlan] = await Promise.all([
    prisma.plan.upsert({
      where: { name: 'FREE' },
      update: {},
      create: {
        name: 'FREE',
        price: 0,
        durationDays: 36500,
        maxActiveAssessments: 1,
        maxInvitesPerAssessment: 5,
        features: ['1 active assessment', 'Up to 5 invites per assessment'],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'BASIC' },
      update: {},
      create: {
        name: 'BASIC',
        price: 999,
        durationDays: 30,
        maxActiveAssessments: 5,
        maxInvitesPerAssessment: 50,
        features: ['5 active assessments', 'Up to 50 invites per assessment', 'Email support'],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'PRO' },
      update: {},
      create: {
        name: 'PRO',
        price: 2999,
        durationDays: 30,
        maxActiveAssessments: 50,
        maxInvitesPerAssessment: 500,
        features: ['50 active assessments', 'Up to 500 invites per assessment', 'Priority support'],
      },
    }),
  ]);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@codeassess.dev';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Platform Admin',
      email: adminEmail,
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Admin ready -> ${adminEmail} / ${adminPassword}`);

  const demoCompanyPassword = await bcrypt.hash('Company@12345', 12);
  const companyUser = await prisma.user.upsert({
    where: { email: 'company@demo.dev' },
    update: {},
    create: {
      name: 'Demo Recruiter',
      email: 'company@demo.dev',
      password: demoCompanyPassword,
      role: 'COMPANY',
    },
  });

  const companyProfile = await prisma.companyProfile.upsert({
    where: { userId: companyUser.id },
    update: {},
    create: {
      userId: companyUser.id,
      companyName: 'Acme Tech Ltd.',
      website: 'https://acme.example.com',
      industry: 'Software',
      planId: basicPlan.id,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartAt: new Date(),
      subscriptionEndsAt: new Date(Date.now() + basicPlan.durationDays * 24 * 60 * 60 * 1000),
    },
  });

  const demoCandidatePassword = await bcrypt.hash('Candidate@12345', 12);
  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@demo.dev' },
    update: {},
    create: {
      name: 'Demo Candidate',
      email: 'candidate@demo.dev',
      password: demoCandidatePassword,
      role: 'CANDIDATE',
    },
  });

  const candidateProfile = await prisma.candidateProfile.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      phone: '01700000000',
      skills: ['JavaScript', 'Node.js', 'SQL'],
    },
  });

  const existingAssessment = await prisma.assessment.findFirst({
    where: { companyId: companyProfile.id, title: 'Backend Engineer Screening' },
  });

  const assessment =
    existingAssessment ||
    (await prisma.assessment.create({
      data: {
        companyId: companyProfile.id,
        title: 'Backend Engineer Screening',
        description: 'A short screening test covering JavaScript fundamentals and SQL basics.',
        durationMinutes: 30,
        passingScore: 10,
        status: 'DRAFT',
      },
    }));

  const problemCount = await prisma.problem.count({ where: { assessmentId: assessment.id } });
  if (problemCount === 0) {
    await prisma.problem.create({
      data: {
        assessmentId: assessment.id,
        type: 'MCQ',
        title: 'Which keyword declares a block-scoped variable in JavaScript?',
        description: 'Select the correct keyword.',
        marks: 10,
        order: 0,
        options: {
          create: [
            { text: 'var', isCorrect: false, order: 0 },
            { text: 'let', isCorrect: true, order: 1 },
            { text: 'function', isCorrect: false, order: 2 },
            { text: 'const_var', isCorrect: false, order: 3 },
          ],
        },
      },
    });

    await prisma.problem.create({
      data: {
        assessmentId: assessment.id,
        type: 'CODING',
        title: 'Write a function that reverses a string',
        description: 'Implement `reverseString(str)` that returns the input string reversed.',
        marks: 20,
        order: 1,
        languageHint: 'javascript',
        starterCode: 'function reverseString(str) {\n  // your code here\n}',
        testCases: [
          { input: '"hello"', expectedOutput: '"olleh"' },
          { input: '"ab"', expectedOutput: '"ba"' },
        ],
      },
    });

    await prisma.problem.create({
      data: {
        assessmentId: assessment.id,
        type: 'WRITTEN',
        title: 'Explain database indexing',
        description: 'In 3-5 sentences, explain what a database index is and when you would add one.',
        marks: 10,
        order: 2,
        correctAnswerText:
          'A model answer should mention faster lookups, the read/write trade-off, and choosing indexed columns based on query patterns.',
      },
    });
  }

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { status: 'PUBLISHED', totalMarks: 40 },
  });

  const existingInvitation = await prisma.invitation.findUnique({
    where: { assessmentId_candidateId: { assessmentId: assessment.id, candidateId: candidateProfile.id } },
  });

  if (!existingInvitation) {
    await prisma.invitation.create({
      data: {
        assessmentId: assessment.id,
        candidateId: candidateProfile.id,
        email: candidateUser.email,
        token: 'demo-seed-invitation-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Demo company -> company@demo.dev / Company@12345`);
  console.log(`Demo candidate -> candidate@demo.dev / Candidate@12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
