import { Elysia, t } from "elysia";
// Asigură-te că exporți handleGenerateApiKey din handlers
import { handleRegister, handleLogin, handleGenerateApiKey } from "./handlers";
// 👇 IMPORTĂ MIDDLEWARE-UL TĂU AICI (ajustează calea dacă fișierul tău se numește altfel)
import { authMiddleware } from "../middleware/auth.middleware";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
    .post("/register", handleRegister, {
        body: t.Object({
            username: t.String(),
            email: t.String(),
            password: t.String(),
        }),
    })
    .post("/login", handleLogin, {
        body: t.Object({
            email: t.String(),
            password: t.String(),
        }),
    })
    // 🛡️ BARIERA DE SECURITATE: Tot ce urmează sub linia asta necesită cont logat!
    .use(authMiddleware)
    .post("/generate-api-key", handleGenerateApiKey);