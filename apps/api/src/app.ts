import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { authPlugin } from "./plugins/auth.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { studentRoutes } from "./modules/students/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { roleRoutes } from "./modules/admin/role-routes.js";
import { attendanceRoutes } from "./modules/attendance/routes.js";
import { financeRoutes } from "./modules/finance/routes.js";
import { communicationRoutes } from "./modules/communication/routes.js";
import { schoolRoutes } from "./modules/school/routes.js";
import { userRoutes } from "./modules/users/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
        : true,
    trustProxy: true,
  });

  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(authPlugin);

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(adminRoutes);
      await api.register(roleRoutes);
      await api.register(studentRoutes);
      await api.register(attendanceRoutes);
      await api.register(financeRoutes);
      await api.register(communicationRoutes);
      await api.register(schoolRoutes);
      await api.register(userRoutes);
    },
    { prefix: "/api/v1" },
  );

  app.setErrorHandler((err, request, reply) => {
    request.log.error(err);
    const status = err.statusCode ?? 500;
    reply.code(status).send({
      error: status === 500 ? "internal_error" : err.code ?? "error",
      message: status === 500 ? "Something went wrong" : err.message,
    });
  });

  return app;
}
