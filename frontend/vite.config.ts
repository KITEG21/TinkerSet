import { defineConfig, loadEnv } from "vite";

function toPort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.VITE_FRONTEND_HOST ?? "127.0.0.1";
  const port = toPort(env.VITE_FRONTEND_PORT ?? env.VITE_PORT, 5173);

  return {
    server: {
      host,
      port,
    },
    preview: {
      host,
      port,
    },
  };
});