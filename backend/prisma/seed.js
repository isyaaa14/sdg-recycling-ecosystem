import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/utils/slugify.js";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function upsertUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = [
    { id: "USR001", email: "admin@sdg.local", name: "Admin User", role: "ADMIN" },
    { id: "USR002", email: "student1@sdg.local", name: "Student One", role: "STUDENT" },
    { id: "USR003", email: "student2@sdg.local", name: "Student Two", role: "STUDENT" },
    { id: "USR004", email: "student3@sdg.local", name: "Student Three", role: "STUDENT" }
  ];

  const created = [];
  for (const user of users) {
    created.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: { id: user.id, name: user.name, role: user.role, passwordHash },
        create: { ...user, passwordHash }
      })
    );
  }

  return {
    admin: created.find((user) => user.role === "ADMIN"),
    students: created.filter((user) => user.role === "STUDENT")
  };
}

async function upsertMissions(adminId) {
  const missionData = [
    {
      id: "MIS001",
      slug: "bottle-count-challenge",
      title: "Bottle Count Challenge",
      description: "Collect and record recyclable plastic bottles this week.",
      type: "QUANTITY_BASED",
      points: 25,
      submissionCap: 1,
      autoApprove: false
    },
    {
      id: "MIS002",
      slug: "three-day-recycling-streak",
      title: "Three Day Recycling Streak",
      description: "Maintain three consecutive days of recycling activity.",
      type: "STREAK_BASED",
      points: 40,
      submissionCap: 1,
      autoApprove: true
    },
    {
      id: "MIS003",
      slug: "weekend-e-waste-drive",
      title: "Weekend E-Waste Drive",
      description: "Join the campus e-waste collection event and share evidence.",
      type: "TIME_LIMITED",
      points: 50,
      submissionCap: 1,
      autoApprove: false
    }
  ];

  const startAt = new Date();
  const endAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const missions = [];
  for (const mission of missionData) {
    missions.push(
      await prisma.mission.upsert({
        where: { slug: mission.slug },
        update: {
          ...mission,
          startAt,
          endAt,
          status: "ACTIVE",
          isActive: true,
          createdById: adminId
        },
        create: {
          id: mission.id,
          ...mission,
          startAt,
          endAt,
          status: "ACTIVE",
          isActive: true,
          createdById: adminId
        }
      })
    );
  }

  return missions;
}

async function upsertContent(adminId) {
  const contentData = [
    {
      id: "CNT001",
      slug: "plastic-recycling-basics",
      title: "Plastic Recycling Basics",
      body: "Learn how to identify common plastic recycling codes and sort them correctly.",
      tags: ["plastic", "sorting"]
    },
    {
      id: "CNT002",
      slug: "paper-recycling-essentials",
      title: "Paper Recycling Essentials",
      body: "Understand contamination rules and how to prepare paper for recycling.",
      tags: ["paper", "cleanliness"]
    },
    {
      id: "CNT003",
      slug: "e-waste-recycling-awareness",
      title: "E-Waste Recycling Awareness",
      body: "Discover safe disposal paths for electronics and batteries on campus.",
      tags: ["ewaste", "safety"]
    }
  ];

  const contents = [];
  for (const item of contentData) {
    const content = await prisma.content.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        body: item.body,
        tags: item.tags,
        status: "PUBLISHED",
        slug: item.slug,
        createdById: adminId
      },
      create: {
        id: item.id,
        slug: item.slug,
        title: item.title,
        body: item.body,
        tags: item.tags,
        status: "PUBLISHED",
        createdById: adminId
      }
    });

    await prisma.contentRevision.upsert({
      where: { id: `CRV${content.id.slice(3)}01` },
      update: {
        title: content.title,
        body: content.body,
        tags: content.tags,
        status: content.status,
        version: content.version
      },
      create: {
        id: `CRV${content.id.slice(3)}01`,
        contentId: content.id,
        version: content.version,
        title: content.title,
        body: content.body,
        tags: content.tags,
        status: content.status
      }
    });

    contents.push(content);
  }

  return contents;
}

async function upsertQuizzes(contents) {
  for (const content of contents) {
    const quizSlug = `${content.slug}-quiz`;
    const quizId = `QZ${content.id.slice(3)}`;
    const quiz = await prisma.quiz.upsert({
      where: { slug: quizSlug },
      update: { id: quizId, title: `${content.title} Quiz`, passingScore: 70, contentId: content.id, slug: quizSlug },
      create: {
        id: quizId,
        contentId: content.id,
        slug: quizSlug,
        title: `${content.title} Quiz`,
        passingScore: 70
      }
    });

    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quizQuestion.createMany({
      data: [
        {
          id: `QQ${content.id.slice(3)}1`,
          quizId: quiz.id,
          code: `QQ${content.id.slice(3)}1`,
          questionText: `What is the main idea of ${content.title}?`,
          options: ["Reduce contamination", "Burn waste", "Ignore labels"],
          correctAnswer: "Reduce contamination",
          points: 1
        },
        {
          id: `QQ${content.id.slice(3)}2`,
          quizId: quiz.id,
          code: `QQ${content.id.slice(3)}2`,
          questionText: "Which action best supports campus recycling?",
          options: ["Sort correctly", "Mix all materials", "Skip cleaning items"],
          correctAnswer: "Sort correctly",
          points: 1
        },
        {
          id: `QQ${content.id.slice(3)}3`,
          quizId: quiz.id,
          code: `QQ${content.id.slice(3)}3`,
          questionText: "What should students do before disposal?",
          options: ["Check guidelines", "Guess", "Leave items anywhere"],
          correctAnswer: "Check guidelines",
          points: 1
        }
      ]
    });
  }
}

async function upsertBadges() {
  const badges = [
    {
      id: "BDG001",
      name: "First Mission",
      description: "Complete your first mission.",
      tier: "BRONZE",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 1
    },
    {
      id: "BDG002",
      name: "Consistent Recycler",
      description: "Complete five approved missions.",
      tier: "SILVER",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 5
    },
    {
      id: "BDG003",
      name: "Recycling Champion",
      description: "Complete ten approved missions.",
      tier: "GOLD",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 10
    },
    {
      id: "BDG004",
      name: "Learning Starter",
      description: "Pass one quiz.",
      tier: "BRONZE",
      criteriaType: "QUIZZES_PASSED",
      criteriaValue: 1
    }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: slugify(badge.name) },
      update: { ...badge, slug: slugify(badge.name) },
      create: {
        ...badge,
        slug: slugify(badge.name)
      }
    });
  }
}

async function seedSubmissions(missions, students, adminId) {
  const [firstMission, secondMission] = missions;
  const firstStudent = students[0];

  const approvedSubmission = await prisma.missionSubmission.upsert({
    where: { id: "SUB001" },
    update: {
      missionId: firstMission.id,
      userId: firstStudent.id,
      proofText: "Collected 12 bottles from the cafeteria bins.",
      quantity: 12,
      status: "APPROVED",
      reviewedById: adminId,
      reviewedAt: new Date()
    },
    create: {
      id: "SUB001",
      missionId: firstMission.id,
      userId: firstStudent.id,
      proofText: "Collected 12 bottles from the cafeteria bins.",
      quantity: 12,
      status: "APPROVED",
      reviewedById: adminId,
      reviewedAt: new Date()
    }
  });

  await prisma.pointsEvent.upsert({
    where: { id: "PEV001" },
    update: {
      userId: firstStudent.id,
      missionId: firstMission.id,
      submissionId: approvedSubmission.id,
      points: firstMission.points,
      eventType: "MISSION_APPROVED",
      status: "SENT",
      approvedAt: approvedSubmission.reviewedAt ?? new Date()
    },
    create: {
      id: "PEV001",
      userId: firstStudent.id,
      missionId: firstMission.id,
      submissionId: approvedSubmission.id,
      points: firstMission.points,
      eventType: "MISSION_APPROVED",
      status: "SENT",
      approvedAt: approvedSubmission.reviewedAt ?? new Date()
    }
  });

  await prisma.missionSubmission.upsert({
    where: { id: "SUB002" },
    update: {
      missionId: secondMission.id,
      userId: students[1].id,
      proofText: "Maintained my recycling streak for three days.",
      status: "PENDING_REVIEW"
    },
    create: {
      id: "SUB002",
      missionId: secondMission.id,
      userId: students[1].id,
      proofText: "Maintained my recycling streak for three days.",
      status: "PENDING_REVIEW"
    }
  });
}

async function seedProgress(contents, students) {
  for (const student of students) {
    for (const content of contents) {
      await prisma.learningProgress.upsert({
        where: {
          userId_contentId: {
            userId: student.id,
            contentId: content.id
          }
        },
        update: {},
        create: {
          id: `PRG${student.id.slice(3)}${content.id.slice(3)}`,
          userId: student.id,
          contentId: content.id
        }
      });
    }
  }
}

async function main() {
  const { admin, students } = await upsertUsers();
  const missions = await upsertMissions(admin.id);
  const contents = await upsertContent(admin.id);
  await upsertQuizzes(contents);
  await upsertBadges();
  await seedSubmissions(missions, students, admin.id);
  await seedProgress(contents, students);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
