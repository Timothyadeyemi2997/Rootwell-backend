import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const nodeEnv = typeof process !== "undefined" ? process.env.NODE_ENV : undefined;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment");
}

const adapter = new PrismaPg({ connectionString });


const logLevels: Array<"query" | "warn" | "error"> =
nodeEnv === "development" ? ["query", "warn", "error"] : ["error"];

const prismaOptions = {
  adapter,
  log: logLevels
};

export const prisma = global.prisma ?? new PrismaClient(prismaOptions);

if (nodeEnv !== "production") {
  global.prisma = prisma;
}