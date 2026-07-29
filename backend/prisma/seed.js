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
      longDescription:
        "Reduce plastic waste by collecting recyclable plastic bottles from your home, campus, or workplace throughout the week. Sort and count the bottles before submitting your total to encourage responsible recycling habits. Every bottle recycled contributes to a cleaner environment and helps reduce landfill waste.",
      imageUrl: "",
      type: "QUANTITY_BASED",
      targetQuantity: 20,
      guide: [
        {
          step: 1,
          title: "Collect Plastic Bottles",
          description: "Gather empty plastic bottles from your home, classroom, or workplace."
        },
        {
          step: 2,
          title: "Sort and Count",
          description: "Separate recyclable plastic bottles and count the total quantity."
        },
        {
          step: 3,
          title: "Take Proof",
          description: "Take a clear photo showing the collected bottles before recycling them."
        },
        {
          step: 4,
          title: "Submit Mission",
          description: "Upload the photo and enter the total number of bottles collected."
        }
      ],
      points: 25,
      submissionCap: 20,
      autoApprove: false
    },
    {
      id: "MIS002",
      slug: "three-day-recycling-streak",
      title: "Three Day Recycling Streak",
      description: "Maintain three consecutive days of recycling activity.",
      longDescription:
        "Build a sustainable habit by completing at least one recycling activity each day for three consecutive days. Consistency is the key to making environmental responsibility part of your daily routine. Record your progress every day to successfully complete the challenge.",
      imageUrl: "",
      type: "STREAK_BASED",
      targetDays: 3,
      guide: [
        {
          step: 1,
          title: "Recycle Daily",
          description: "Complete at least one recycling activity each day for three consecutive days."
        },
        {
          step: 2,
          title: "Document Your Activity",
          description: "Take a photo or record proof of each day's recycling effort."
        },
        {
          step: 3,
          title: "Keep Your Streak",
          description: "Do not skip a day, or your streak will need to start again."
        },
        {
          step: 4,
          title: "Submit Your Progress",
          description: "Upload your proof after completing the three-day streak."
        }
      ],
      points: 40,
      submissionCap: 3,
      autoApprove: true
    },
    {
      id: "MIS003",
      slug: "weekend-e-waste-drive",
      title: "Weekend E-Waste Drive",
      description: "Join the campus e-waste collection event and share evidence.",
      longDescription:
        "Participate in the campus weekend e-waste collection drive by bringing unwanted electronic items for proper disposal. Recycling electronic waste prevents harmful materials from polluting the environment and allows valuable resources to be recovered. Share your participation by submitting evidence after dropping off your items.",
      imageUrl: "",
      type: "TIME_LIMITED",
      guide: [
        {
          step: 1,
          title: "Prepare E-Waste",
          description: "Collect unused electronic devices or accessories that are no longer needed."
        },
        {
          step: 2,
          title: "Visit the Collection Point",
          description: "Bring your e-waste to the designated campus collection location during the event."
        },
        {
          step: 3,
          title: "Take Proof",
          description: "Capture a photo of yourself or your items at the collection point."
        },
        {
          step: 4,
          title: "Submit Participation",
          description: "Upload the photo as proof to complete the mission."
        }
      ],
      points: 50,
      submissionCap: 1,
      autoApprove: false
    }
  ];

  const startAt = new Date();
  const endAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const missions = [];
  for (const mission of missionData) {
    const { id, imageUrl, ...missionFields } = mission;
    const imageData = imageUrl ? { imageUrl } : {};

    missions.push(
      await prisma.mission.upsert({
        where: { slug: mission.slug },
        update: {
          ...missionFields,
          ...imageData,
          startAt,
          endAt,
          status: "ACTIVE",
          isActive: true,
          createdById: adminId
        },
        create: {
          id,
          ...missionFields,
          ...imageData,
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
      summary: "Learn how to identify common plastic recycling codes and sort them correctly.",
      imageUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
      estimatedReadMinutes: 6,
      body: "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. This guide explains how to read plastic codes, rinse common packaging, and sort bottles before they reach the recycling bin.",
      contentBlocks: [
        {
          type: "paragraph",
          text: "Plastic recycling starts with knowing what each container is made from and whether it is clean enough to be processed. A quick rinse and correct sorting step can prevent an entire batch from becoming contaminated."
        },
        {
          type: "heading",
          text: "Read the Plastic Code"
        },
        {
          type: "paragraph",
          text: "Most bottles and food containers have a small number inside the recycling triangle. PET and HDPE are usually accepted more widely, while mixed plastics may need special handling depending on your local facility."
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=1200&q=80",
          alt: "Sorted plastic bottles prepared for recycling"
        },
        {
          type: "heading",
          text: "Clean Before Sorting"
        },
        {
          type: "paragraph",
          text: "Food residue, liquid, and greasy labels can lower recycling quality. Empty the bottle, rinse it lightly, and flatten it if your campus recycling station asks for compact items."
        }
      ],
      tags: ["plastic", "sorting", "cleanliness"]
    },
    {
      id: "CNT002",
      slug: "paper-recycling-essentials",
      title: "Paper Recycling Essentials",
      summary: "Understand contamination rules and how to prepare paper for recycling.",
      imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=1200&q=80",
      estimatedReadMinutes: 5,
      body: "Paper recycling works best when paper is dry, clean, and separated from food waste. This article explains what paper can be recycled and why wet or greasy paper should be kept out of the recycling stream.",
      contentBlocks: [
        {
          type: "paragraph",
          text: "Paper recycling works best when paper is dry, clean, and separated from food waste. Even a small amount of grease or moisture can make a stack of paper harder to process."
        },
        {
          type: "heading",
          text: "Keep Paper Dry"
        },
        {
          type: "paragraph",
          text: "Notebook paper, clean cardboard, flyers, and envelopes are usually accepted. Tissue, greasy takeaway boxes, and wet paper should be handled as waste or compost depending on local rules."
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
          alt: "Clean paper and cardboard sorted for recycling"
        },
        {
          type: "heading",
          text: "Flatten Cardboard"
        },
        {
          type: "paragraph",
          text: "Flattening cardboard saves bin space and helps collection teams move material more efficiently. Remove plastic tape or food liners where possible before recycling."
        }
      ],
      tags: ["paper", "cleanliness", "sorting"]
    },
    {
      id: "CNT003",
      slug: "e-waste-recycling-awareness",
      title: "E-Waste Recycling Awareness",
      summary: "Discover safe disposal paths for electronics and batteries on campus.",
      imageUrl: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80",
      estimatedReadMinutes: 7,
      body: "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. Learn how to store old devices safely and send them to the correct collection point.",
      contentBlocks: [
        {
          type: "paragraph",
          text: "E-waste contains valuable materials, but it can also contain batteries, heavy metals, and parts that should not enter normal bins. A separate collection path keeps people and the environment safer."
        },
        {
          type: "heading",
          text: "Separate Batteries"
        },
        {
          type: "paragraph",
          text: "Loose lithium batteries can be a fire risk when crushed or exposed to heat. Tape battery terminals where required and place them in a designated battery collection box."
        },
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80",
          alt: "Electronic components prepared for recycling"
        },
        {
          type: "heading",
          text: "Use Approved Drop-Off Points"
        },
        {
          type: "paragraph",
          text: "Phones, chargers, headphones, circuit boards, and small appliances should go to campus e-waste drives or certified recycling partners instead of general waste bins."
        }
      ],
      tags: ["ewaste", "safety", "general"]
    }
  ];

  const contents = [];
  for (const item of contentData) {
    const content = await prisma.content.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        body: item.body,
        summary: item.summary,
        imageUrl: item.imageUrl,
        estimatedReadMinutes: item.estimatedReadMinutes,
        contentBlocks: item.contentBlocks,
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
        summary: item.summary,
        imageUrl: item.imageUrl,
        estimatedReadMinutes: item.estimatedReadMinutes,
        contentBlocks: item.contentBlocks,
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
        summary: content.summary,
        imageUrl: content.imageUrl,
        estimatedReadMinutes: content.estimatedReadMinutes,
        contentBlocks: content.contentBlocks,
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
        summary: content.summary,
        imageUrl: content.imageUrl,
        estimatedReadMinutes: content.estimatedReadMinutes,
        contentBlocks: content.contentBlocks,
        tags: content.tags,
        status: content.status
      }
    });

    contents.push(content);
  }

  return contents;
}

const quizQuestionsByContentId = {
  CNT001: [
    {
      questionText: "Which plastic code is commonly used for water and soft drink bottles?",
      options: ["PET", "PVC", "Polystyrene Foam", "Mixed Plastic"],
      correctAnswer: "PET"
    },
    {
      questionText: "What should you do before putting a plastic bottle into the recycling bin?",
      options: ["Empty and rinse it", "Leave liquid inside", "Wrap it in tissue", "Mix it with food waste"],
      correctAnswer: "Empty and rinse it"
    },
    {
      questionText: "Why is sorting plastic by type important?",
      options: ["It reduces contamination", "It makes bins heavier", "It hides non-recyclables", "It replaces collection labels"],
      correctAnswer: "It reduces contamination"
    },
    {
      questionText: "Which plastic type is usually accepted more widely together with PET?",
      options: ["HDPE", "PVC film", "Polystyrene Foam", "Melamine"],
      correctAnswer: "HDPE"
    },
    {
      questionText: "What can happen when dirty plastic packaging enters a recycling batch?",
      options: ["The batch quality drops", "The plastic becomes cleaner", "The bin accepts more waste", "The item gains more value"],
      correctAnswer: "The batch quality drops"
    }
  ],
  CNT002: [
    {
      questionText: "Which paper item is most suitable for recycling?",
      options: ["Clean cardboard", "Greasy pizza box", "Wet tissue", "Food-stained wrapper"],
      correctAnswer: "Clean cardboard"
    },
    {
      questionText: "Why should paper be kept dry before recycling?",
      options: ["Moisture lowers paper quality", "Wet paper becomes plastic", "Dry paper cannot be collected", "Moisture removes ink automatically"],
      correctAnswer: "Moisture lowers paper quality"
    },
    {
      questionText: "What should you do with cardboard boxes before recycling them?",
      options: ["Flatten them", "Fill them with food waste", "Soak them in water", "Tape them into a bundle with plastic"],
      correctAnswer: "Flatten them"
    },
    {
      questionText: "Which item should usually be kept out of the paper recycling stream?",
      options: ["Greasy takeaway box", "Notebook paper", "Clean envelope", "Dry flyer"],
      correctAnswer: "Greasy takeaway box"
    },
    {
      questionText: "What is the main reason to remove food residue from paper packaging?",
      options: ["To prevent contamination", "To make the package heavier", "To hide the paper label", "To make sorting unnecessary"],
      correctAnswer: "To prevent contamination"
    }
  ],
  CNT003: [
    {
      questionText: "Why should e-waste be collected separately from normal waste?",
      options: ["It may contain hazardous materials", "It is always compostable", "It is lighter than paper", "It does not contain reusable parts"],
      correctAnswer: "It may contain hazardous materials"
    },
    {
      questionText: "What should you do with loose lithium batteries before disposal when required?",
      options: ["Tape the terminals", "Throw them into general waste", "Crush them first", "Soak them in water"],
      correctAnswer: "Tape the terminals"
    },
    {
      questionText: "Which item belongs in an e-waste collection point?",
      options: ["Old charger", "Clean cardboard", "Banana peel", "Glass jar"],
      correctAnswer: "Old charger"
    },
    {
      questionText: "Why are certified e-waste partners important?",
      options: ["They handle electronics safely", "They mix electronics with food waste", "They remove the need for sorting", "They only collect paper"],
      correctAnswer: "They handle electronics safely"
    },
    {
      questionText: "Which habit supports safer campus e-waste recycling?",
      options: ["Use approved drop-off points", "Place devices in normal bins", "Ignore batteries", "Break devices before handover"],
      correctAnswer: "Use approved drop-off points"
    }
  ]
};

function fallbackQuizQuestions(content) {
  return [
    {
      questionText: `What is the main idea of ${content.title}?`,
      options: ["Reduce contamination", "Burn waste", "Ignore labels"],
      correctAnswer: "Reduce contamination"
    },
    {
      questionText: "Which action best supports campus recycling?",
      options: ["Sort correctly", "Mix all materials", "Skip cleaning items"],
      correctAnswer: "Sort correctly"
    },
    {
      questionText: "What should students do before disposal?",
      options: ["Check guidelines", "Guess", "Leave items anywhere"],
      correctAnswer: "Check guidelines"
    },
    {
      questionText: "Why is correct sorting important?",
      options: ["It reduces contamination", "It slows collection", "It hides waste"],
      correctAnswer: "It reduces contamination"
    },
    {
      questionText: "What habit supports sustainable recycling?",
      options: ["Follow campus bin labels", "Mix all waste together", "Ignore collection rules"],
      correctAnswer: "Follow campus bin labels"
    }
  ];
}

async function upsertQuizzes(contents) {
  for (const content of contents) {
    const quizSlug = `${content.slug}-quiz`;
    const quizId = `QZ${content.id.slice(3)}`;
    const quizQuestions = quizQuestionsByContentId[content.id] ?? fallbackQuizQuestions(content);
    const passingScore = Math.ceil(quizQuestions.length * 0.7);
    const quiz = await prisma.quiz.upsert({
      where: { slug: quizSlug },
      update: { id: quizId, title: `${content.title} Quiz`, passingScore, contentId: content.id, slug: quizSlug },
      create: {
        id: quizId,
        contentId: content.id,
        slug: quizSlug,
        title: `${content.title} Quiz`,
        passingScore
      }
    });

    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quizQuestion.createMany({
      data: quizQuestions.map((question, index) => ({
        id: `QQ${content.id.slice(3)}${index + 1}`,
        quizId: quiz.id,
        code: `QQ${content.id.slice(3)}${index + 1}`,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: 1
      }))
    });
  }
}

async function upsertBadges() {
  const badges = [
    {
      id: "BDG001",
      name: "Mission Finisher",
      description: "Finish one mission by reaching its required progress target.",
      tier: "BRONZE",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 1
    },
    {
      id: "BDG002",
      name: "Mission Achiever",
      description: "Finish three missions by reaching each mission's full progress target.",
      tier: "SILVER",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 3
    },
    {
      id: "BDG003",
      name: "Mission Master",
      description: "Finish five missions by fully completing their required progress.",
      tier: "GOLD",
      criteriaType: "MISSIONS_COMPLETED",
      criteriaValue: 5
    },
    {
      id: "BDG004",
      name: "Quiz Pass Starter",
      description: "Submit a quiz attempt and pass it once.",
      tier: "BRONZE",
      criteriaType: "QUIZZES_PASSED",
      criteriaValue: 1
    },
    {
      id: "BDG005",
      name: "Quiz Pass Builder",
      description: "Submit and pass three quiz attempts.",
      tier: "SILVER",
      criteriaType: "QUIZZES_PASSED",
      criteriaValue: 3
    },
    {
      id: "BDG006",
      name: "Quiz Pass Expert",
      description: "Submit and pass five quiz attempts.",
      tier: "GOLD",
      criteriaType: "QUIZZES_PASSED",
      criteriaValue: 5
    },
    {
      id: "BDG007",
      name: "Content Starter",
      description: "Complete one learning content item. Each content item only counts once.",
      tier: "BRONZE",
      criteriaType: "CONTENT_COMPLETED",
      criteriaValue: 1
    },
    {
      id: "BDG008",
      name: "Knowledge Collector",
      description: "Complete three different learning content items.",
      tier: "SILVER",
      criteriaType: "CONTENT_COMPLETED",
      criteriaValue: 3
    },
    {
      id: "BDG009",
      name: "Eco Scholar",
      description: "Complete five different learning content items.",
      tier: "GOLD",
      criteriaType: "CONTENT_COMPLETED",
      criteriaValue: 5
    },
    {
      id: "BDG010",
      name: "First Approval",
      description: "Receive one approved mission submission.",
      tier: "BRONZE",
      criteriaType: "APPROVED_SUBMISSIONS",
      criteriaValue: 1
    },
    {
      id: "BDG011",
      name: "Verified Contributor",
      description: "Receive five approved mission submissions.",
      tier: "SILVER",
      criteriaType: "APPROVED_SUBMISSIONS",
      criteriaValue: 5
    },
    {
      id: "BDG012",
      name: "Approval Champion",
      description: "Receive ten approved mission submissions.",
      tier: "GOLD",
      criteriaType: "APPROVED_SUBMISSIONS",
      criteriaValue: 10
    }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { id: badge.id },
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
