import type { FastifyInstance } from "fastify";
import { systemPrisma } from "@iskool/db";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  app.get("/health/ready", async (_req, reply) => {
    try {
      await systemPrisma.$queryRaw`SELECT 1`;
      return { status: "ready", db: "up" };
    } catch (err) {
      app.log.error(err, "readiness check failed");
      return reply.code(503).send({ status: "not_ready", db: "down" });
    }
  });
}
