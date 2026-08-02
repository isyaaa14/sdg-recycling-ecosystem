import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SEQUENCE_WIDTH = 3;
const MAX_ATTEMPTS = 5;

async function nextSequentialId(model, prefix) {
  const records = await prisma[model].findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true }
  });
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const maxSequence = records.reduce((max, record) => {
    const match = pattern.exec(record.id);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `${prefix}${String(maxSequence + 1).padStart(SEQUENCE_WIDTH, "0")}`;
}

export async function createWithGeneratedId(model, prefix, createFn) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const id = await nextSequentialId(model, prefix);
    try {
      return await createFn(id);
    } catch (error) {
      const isIdConflict = error.code === "P2002" && error.meta?.target?.includes("id");
      if (!isIdConflict || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }
}
