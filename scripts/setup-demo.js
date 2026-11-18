// Get the app ready for a demo: .env, Postgres, migrations and the demo user.
//   pnpm demo:setup   prepare only
//   pnpm demo         prepare, then start api + web (pnpm dev)
// Safe to re-run: it only replaces the demo user, so run it on the day of the
// demo to date the weigh-ins, workouts and today's meals from that day.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const start = process.argv.includes("--start");

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
const step = (msg) => console.log(`\n▶ ${msg}`);
const fail = (msg) => {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
};

/** Resolves to true when nothing is listening on the port yet. */
const portFree = (port) =>
  new Promise((resolve) => {
    const server = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => server.close(() => resolve(true)))
      .listen(port);
  });

function readEnv() {
  const env = {};
  for (const line of readFileSync(`${root}/.env`, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

step("Checking .env");
if (existsSync(`${root}/.env`)) {
  console.log(".env found, keeping it");
} else {
  const secret = () => randomBytes(32).toString("base64");
  const example = readFileSync(`${root}/.env.example`, "utf8")
    .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${secret()}`)
    .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${secret()}`);
  writeFileSync(`${root}/.env`, example);
  console.log("Created .env from .env.example with random JWT secrets");
}

step("Checking Docker");
try {
  execFileSync("docker", ["info"], { stdio: "ignore" });
} catch {
  fail("Docker isn't running. Start Docker Desktop, then run this again.");
}

step("Starting Postgres");
run("docker", ["compose", "up", "-d", "--wait"]);

step("Applying migrations");
run("pnpm", ["db:migrate"]);

step("Seeding foods, exercises and the demo user");
run("pnpm", ["db:seed", "--demo"]);

const env = readEnv();
const apiPort = Number(env.PORT || 3000);
const webPort = Number(env.WEB_PORT || 5173);

console.log(`
✔ Demo ready
  Open   http://localhost:${webPort}
  Login  demo@example.com / demo-password
`);

if (start) {
  const busy = [];
  for (const port of [apiPort, webPort]) {
    if (!(await portFree(port))) busy.push(port);
  }
  if (busy.length) {
    const ports = busy.length > 1 ? `Ports ${busy.join(" and ")} are` : `Port ${busy[0]} is`;
    fail(`${ports} already in use. Stop whatever runs there, then try again.`);
  }
  step("Starting api + web (Ctrl+C to stop)");
  spawn("pnpm", ["dev"], { cwd: root, stdio: "inherit" }).on("exit", (code) =>
    process.exit(code ?? 0),
  );
} else {
  console.log("Start the app with: pnpm dev");
}
