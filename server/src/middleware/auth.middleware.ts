import { Elysia } from "elysia";
import { getUserById } from "../lib/auth";
import db from "../db";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
    .derive(async ({ headers, jwt }) => {
        const authHeader = headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return { user: null };
        }

        const token = authHeader.substring(7); // Extragem string-ul de după "Bearer "

        // ✨ HINT IMPLEMENTAT: Suport pentru Developer API Keys
        if (token.startsWith("pk_")) {
            // Dacă e API Key, căutăm user-ul direct după cheie
            const user = await db.query.usersTable.findFirst({
                where: eq(usersTable.apiKey, token),
            });

            return { user: user || null };
        }

        // 🔒 Logica originală pentru utilizatorii din Browser (JWT)
        const payload = await jwt.verify(token);
        if (!payload) {
            return { user: null };
        }

        const user = await getUserById(payload.userId);
        return { user };
    })
    .as("plugin");