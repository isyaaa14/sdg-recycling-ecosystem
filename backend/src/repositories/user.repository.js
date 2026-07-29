import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createUser(data) {
  return prisma.user.create({ data });
}

export function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}
