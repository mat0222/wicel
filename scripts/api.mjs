import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dockerDesktop = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";

const dockerReady = () => spawnSync("docker info", { stdio: "ignore", shell: true }).status === 0;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

if (!dockerReady()) {
  if (process.platform === "win32" && existsSync(dockerDesktop)) {
    console.log("Abriendo Docker Desktop para levantar la API...");
    spawn(dockerDesktop, [], { detached: true, stdio: "ignore" }).unref();
  } else {
    console.log("Docker no está corriendo. Abrilo para levantar la API.");
  }
  const until = Date.now() + 120_000;
  while (!dockerReady() && Date.now() < until) await sleep(3000);
}

if (!dockerReady()) {
  console.warn("Docker no respondió en 2 minutos. La tienda abre igual, pero sin API hasta que Docker arranque (después corré: docker compose up -d).");
} else {
  const up = spawnSync("docker compose up -d", { cwd: root, stdio: "inherit", shell: true });
  if (up.status !== 0) console.warn("No se pudo levantar la API con docker compose. Revisá el mensaje de arriba.");
}
