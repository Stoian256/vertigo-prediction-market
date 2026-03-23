import { eq, and } from "drizzle-orm";
import db from "../db";
import { randomBytes } from "crypto";
import { usersTable, marketsTable, marketOutcomesTable, betsTable } from "../db/schema";
import { hashPassword, verifyPassword, type AuthTokenPayload } from "../lib/auth";
import {
  validateRegistration,
  validateLogin,
  validateMarketCreation,
  validateBet,
} from "../lib/validation";

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

export async function handleRegister({
                                       body,
                                       jwt,
                                       set,
                                     }: {
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { username, email, password } = body;
  const errors = validateRegistration(username, email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const existingUser = await db.query.usersTable.findFirst({
    where: (users, { or, eq }) => or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db.insert(usersTable).values({ username, email, passwordHash }).returning();

  const token = await jwt.sign({ userId: newUser[0].id });

  set.status = 201;
  return {
    id: newUser[0].id,
    username: newUser[0].username,
    email: newUser[0].email,
    token,
    // 👇 ADDED THESE TWO LINES 👇
    balance: newUser[0].balance,
    role: newUser[0].role,
  };
}

export async function handleLogin({
                                    body,
                                    jwt,
                                    set,
                                  }: {
  body: { email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { email, password } = body;
  const errors = validateLogin(email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }

  const token = await jwt.sign({ userId: user.id });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    token,
    // 👇 ADDED THESE TWO LINES 👇
    balance: user.balance,
    role: user.role,
  };
}

export async function handleCreateMarket({
                                           body,
                                           set,
                                           user,
                                         }: {
  body: { title: string; description?: string; outcomes: string[] };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const { title, description, outcomes } = body;
  const errors = validateMarketCreation(title, description || "", outcomes);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const market = await db
      .insert(marketsTable)
      .values({
        title,
        description: description || null,
        createdBy: user.id,
      })
      .returning();

  const outcomeIds = await db
      .insert(marketOutcomesTable)
      .values(
          outcomes.map((title: string, index: number) => ({
            marketId: market[0].id,
            title,
            position: index,
          })),
      )
      .returning();

  set.status = 201;
  return {
    id: market[0].id,
    title: market[0].title,
    description: market[0].description,
    status: market[0].status,
    outcomes: outcomeIds,
  };
}

export async function handleListMarkets({
                                          query,
                                        }: {
  query: { status?: string; page?: string; sortBy?: string };
}) {
  const statusFilter = query.status || "active";
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = 20;
  const sortBy = query.sortBy || "newest"; // "newest", "pool", "participants"

  // 1. Fetch all matching markets
  const markets = await db.query.marketsTable.findMany({
    where: eq(marketsTable.status, statusFilter),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  // 2. Enrich markets with bets, odds, and participants
  const enrichedMarkets = await Promise.all(
      markets.map(async (market) => {
        // Fetch all bets for this specific market
        const allMarketBets = await db
            .select()
            .from(betsTable)
            .where(eq(betsTable.marketId, market.id));

        const totalMarketBets = allMarketBets.reduce((sum, bet) => sum + bet.amount, 0);

        // Calculate unique participants by putting userIds into a Set
        const participants = new Set(allMarketBets.map(bet => bet.userId)).size;

        return {
          id: market.id,
          title: market.title,
          status: market.status,
          creator: market.creator?.username,
          // Fallback to ID if createdAt doesn't exist on the schema
          createdAt: (market as any).createdAt || market.id,
          participants,
          totalMarketBets,
          outcomes: market.outcomes.map((outcome) => {
            // Find bets specific to this outcome
            const outcomeBets = allMarketBets
                .filter((b) => b.outcomeId === outcome.id)
                .reduce((sum, bet) => sum + bet.amount, 0);

            const odds =
                totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

            return {
              id: outcome.id,
              title: outcome.title,
              odds,
              totalBets: outcomeBets,
            };
          }),
        };
      }),
  );

  // 3. Sort the markets in memory based on the user's choice
  enrichedMarkets.sort((a, b) => {
    if (sortBy === "pool") return b.totalMarketBets - a.totalMarketBets;
    if (sortBy === "participants") return b.participants - a.participants;
    // Default: newest first
    return b.createdAt > a.createdAt ? -1 : 1;
  });

  // 4. Paginate the results (Slice the array for the current page)
  const startIndex = (page - 1) * limit;
  const paginatedMarkets = enrichedMarkets.slice(startIndex, startIndex + limit);

  // We return an object containing the data AND the pagination info
  // so the frontend knows if there is a "Next Page"
  return {
    data: paginatedMarkets,
    pagination: {
      total: enrichedMarkets.length,
      page,
      totalPages: Math.ceil(enrichedMarkets.length / limit),
    },
  };
}

export async function handleGetMarket({
                                        params,
                                        set,
                                      }: {
  params: { id: number };
  set: { status: number };
}) {
  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  const betsPerOutcome = await Promise.all(
      market.outcomes.map(async (outcome) => {
        const totalBets = await db
            .select()
            .from(betsTable)
            .where(eq(betsTable.outcomeId, outcome.id));

        const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
        return { outcomeId: outcome.id, totalBets: totalAmount };
      }),
  );

  const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);

  return {
    id: market.id,
    title: market.title,
    description: market.description,
    status: market.status,
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome) => {
      const outcomeBets = betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
          totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

      return {
        id: outcome.id,
        title: outcome.title,
        odds,
        totalBets: outcomeBets,
      };
    }),
    totalMarketBets,
  };
}

export async function handlePlaceBet({
                                       params,
                                       body,
                                       set,
                                       user,
                                     }: {
  params: { id: number };
  body: { outcomeId: number; amount: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const marketId = params.id;
  const { outcomeId, amount } = body;
  const errors = validateBet(amount);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  // 1. Fetch the user's current balance from the DB (to get the freshest value)
  const dbUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, user.id)
  });

  if (!dbUser) {
    set.status = 404;
    return { error: "User not found" };
  }

  // 2. Check if they have enough money!
  if (dbUser.balance < amount) {
    set.status = 400;
    return { error: `Insufficient funds. Your balance is $${dbUser.balance.toFixed(2)}` };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }

  const outcome = await db.query.marketOutcomesTable.findFirst({
    where: and(eq(marketOutcomesTable.id, outcomeId), eq(marketOutcomesTable.marketId, marketId)),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  // 3. Insert the bet
  const bet = await db
      .insert(betsTable)
      .values({
        userId: user.id,
        marketId,
        outcomeId,
        amount: Number(amount),
      })
      .returning();

  // 4. DEDUCT THE BALANCE
  const finalBalance = dbUser.balance - amount;
  await db
      .update(usersTable)
      .set({ balance: finalBalance })
      .where(eq(usersTable.id, user.id));

  set.status = 201;

  return {
    id: bet[0].id,
    userId: bet[0].userId,
    marketId: bet[0].marketId,
    outcomeId: bet[0].outcomeId,
    amount: bet[0].amount,
    newBalance: finalBalance // Send back the new balance
  };
}

export async function handleGetMyBets({
                                        query,
                                        user,
                                      }: {
  query: { status?: string; page?: string };
  user: typeof usersTable.$inferSelect;
}) {
  const statusFilter = query.status || "active";
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = 20;

  // 1. Fetch all bets for this specific user
  const myBets = await db.query.betsTable.findMany({
    where: eq(betsTable.userId, user.id),
    with: {
      market: true,
      outcome: true,
    },
    orderBy: (bets, { desc }) => desc(bets.createdAt),
  });

  // 2. Filter by market status (Active or Resolved)
  const filteredBets = myBets.filter((b) => b.market.status === statusFilter);

  // 3. Paginate
  const startIndex = (page - 1) * limit;
  const paginatedBets = filteredBets.slice(startIndex, startIndex + limit);

  // 4. Enrich with odds (if active) and win/loss (if resolved)
  const enrichedBets = await Promise.all(
      paginatedBets.map(async (bet) => {
        let odds = 0;
        let won = false;

        if (statusFilter === "active") {
          // Calculate live odds for active bets
          const allMarketBets = await db
              .select()
              .from(betsTable)
              .where(eq(betsTable.marketId, bet.marketId));

          const totalMarketBets = allMarketBets.reduce((sum, b) => sum + b.amount, 0);
          const outcomeBets = allMarketBets
              .filter((b) => b.outcomeId === bet.outcomeId)
              .reduce((sum, b) => sum + b.amount, 0);

          odds = totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;
        } else {
          // Determine win/loss for resolved bets
          won = bet.market.resolvedOutcomeId === bet.outcomeId;
        }

        return {
          id: bet.id,
          amount: bet.amount,
          createdAt: bet.createdAt,
          market: {
            id: bet.market.id,
            title: bet.market.title,
            status: bet.market.status,
          },
          outcome: {
            id: bet.outcome.id,
            title: bet.outcome.title,
          },
          odds,
          won,
        };
      })
  );

  return {
    data: enrichedBets,
    pagination: {
      total: filteredBets.length,
      page,
      totalPages: Math.ceil(filteredBets.length / limit),
    },
  };
}

export async function handleGetLeaderboard() {
  // 1. Fetch all resolved markets and their bets
  const resolvedMarkets = await db.query.marketsTable.findMany({
    where: eq(marketsTable.status, "resolved"),
    with: {
      bets: true,
    },
  });

  // 2. Map to store each user's total winnings
  const userWinnings: Record<number, number> = {};

  // 3. Calculate payouts for each market
  for (const market of resolvedMarkets) {
    if (!market.resolvedOutcomeId) continue;

    const totalPool = market.bets.reduce((sum, bet) => sum + bet.amount, 0);
    const winningBets = market.bets.filter((b) => b.outcomeId === market.resolvedOutcomeId);
    const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

    // Distribute the pool to the winners based on their stake proportion
    if (winningPool > 0) {
      for (const bet of winningBets) {
        const proportion = bet.amount / winningPool;
        const payout = proportion * totalPool;
        userWinnings[bet.userId] = (userWinnings[bet.userId] || 0) + payout;
      }
    }
  }

  // 4. Get the user IDs of the winners
  const winnerIds = Object.keys(userWinnings).map(Number);
  if (winnerIds.length === 0) return [];

  // 5. Fetch usernames for the winners
  const users = await db.query.usersTable.findMany();
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  // 6. Format, sort descending by winnings, and take top 50
  const leaderboard = winnerIds
      .map((id) => ({
        id,
        username: userMap.get(id) || "Unknown User",
        totalWinnings: userWinnings[id],
      }))
      .sort((a, b) => b.totalWinnings - a.totalWinnings)
      .slice(0, 50);

  return leaderboard;
}

export async function handleResolveMarket({
                                            params,
                                            body,
                                            set,
                                            user,
                                          }: {
  params: { id: number };
  body: { outcomeId: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden: Only admins can resolve markets." };
  }

  const marketId = params.id;
  const { outcomeId } = body;

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
    with: { bets: true },
  });

  if (!market) { set.status = 404; return { error: "Market not found" }; }
  if (market.status !== "active") { set.status = 400; return { error: "Market already resolved" }; }

  await db.update(marketsTable)
      .set({ status: "resolved", resolvedOutcomeId: outcomeId })
      .where(eq(marketsTable.id, marketId));

  const totalPool = market.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const winningBets = market.bets.filter((b) => b.outcomeId === outcomeId);
  const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

  if (winningPool > 0) {
    for (const bet of winningBets) {
      const proportion = bet.amount / winningPool;
      const winnings = proportion * totalPool;

      const winner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, bet.userId) });
      if (winner) {
        await db.update(usersTable)
            .set({ balance: winner.balance + winnings })
            .where(eq(usersTable.id, winner.id));
      }
    }
  }

  // EXTRAGEM DIN NOU BALANȚA ADMINULUI, DUPĂ CE S-AU FĂCUT PLĂȚILE
  const updatedAdmin = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, user.id)
  });


  // TRIMITEM CĂTRE FRONTEND
  return {
    success: true,
    message: "Market resolved and payouts distributed!",
    newBalance: updatedAdmin?.balance
  };

}

export async function handleArchiveMarket({
                                            params,
                                            set,
                                            user,
                                          }: {
  params: { id: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  // Doar Adminii pot face asta
  if (user.role !== "admin") {
    set.status = 403;
    return {error: "Forbidden: Only admins can archive markets."};
  }

  const marketId = params.id;

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
    with: {bets: true},
  });

  if (!market) {
    set.status = 404;
    return {error: "Market not found"};
  }
  if (market.status !== "active") {
    set.status = 400;
    return {error: "Market already closed"};
  }

  // 1. Schimbăm statusul pieței în "archived"
  await db.update(marketsTable)
      .set({status: "archived"})
      .where(eq(marketsTable.id, marketId));

  // 2. RAMBURSĂM TOȚI BANII EXACT CUM AU FOST PARIAȚI
  for (const bet of market.bets) {
    const bettor = await db.query.usersTable.findFirst({where: eq(usersTable.id, bet.userId)});
    if (bettor) {
      await db.update(usersTable)
          .set({balance: bettor.balance + bet.amount})
          .where(eq(usersTable.id, bettor.id));
    }
  }

  // 3. Luăm balanța Adminului actualizată (în caz că a pariat și i s-au returnat banii)
  const updatedAdmin = await db.query.usersTable.findFirst({where: eq(usersTable.id, user.id)});

  return {
    success: true,
    message: "Market archived and all bets refunded!",
    newBalance: updatedAdmin?.balance
  };

}

export async function handleGenerateApiKey({
                                             set,
                                             user,
                                           }: {
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  // Generăm o cheie unică de tipul "pk_1a2b3c..."
  const newApiKey = "pk_" + randomBytes(24).toString("hex");

  // Salvăm cheia în DB pentru acest utilizator
  await db.update(usersTable)
      .set({ apiKey: newApiKey })
      .where(eq(usersTable.id, user.id));

  return { success: true, apiKey: newApiKey };
}
