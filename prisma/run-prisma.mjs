import { spawnSync } from "node:child_process";

const provider = process.env.DATABASE_PROVIDER === "postgresql" ? "postgresql" : "sqlite";
const schema = provider === "postgresql" ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";
const incomingArgs = process.argv.slice(2);
const args =
  provider === "postgresql" && incomingArgs[0] === "migrate"
    ? ["db", "push"]
    : incomingArgs;

const result = spawnSync("npx", ["prisma", ...args, "--schema", schema], {
  stdio: "inherit",
  shell: true
});

process.exit(result.status ?? 1);
