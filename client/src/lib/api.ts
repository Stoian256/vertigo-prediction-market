const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

// Types
export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved";
  creator?: string;
  outcomes: MarketOutcome[];
  totalMarketBets: number;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}
// Add this new interface for the paginated response
export interface PaginatedMarkets {
  data: Market[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  token: string;
  balance: number;
  role: "user" | "admin";
}
export interface Bet {
  id: number;
  userId: number;
  marketId: number;
  outcomeId: number;
  amount: number;
  createdAt: string;
}

export interface MyBet {
  id: number;
  amount: number;
  createdAt: string;
  market: {
    id: number;
    title: string;
    status: string;
  };
  outcome: {
    id: number;
    title: string;
  };
  odds: number;
  won: boolean;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  totalWinnings: number;
}

export interface PaginatedBets {
  data: MyBet[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader() {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // If there are validation errors, throw them
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data ?? {};
  }

  // Auth endpoints
  async register(username: string, email: string, password: string): Promise<User> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Markets endpoints
  async listMarkets(
      status: "active" | "resolved" = "active",
      page: number = 1,
      sortBy: string = "newest"
  ): Promise<PaginatedMarkets> { // <--- Changed return type here
    return this.request(`/api/markets?status=${status}&page=${page}&sortBy=${sortBy}`);
  }

  async getMarket(id: number): Promise<Market> {
    return this.request(`/api/markets/${id}`);
  }

  async createMarket(title: string, description: string, outcomes: string[]): Promise<Market> {
    return this.request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

  async getMyBets(status: "active" | "resolved", page: number = 1): Promise<PaginatedBets> {
    return this.request(`/api/markets/my-bets?status=${status}&page=${page}`);
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.request("/api/markets/leaderboard");
  }

  // Bets endpoints
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }

  // În client/src/lib/api.ts
  async resolveMarket(marketId: number, outcomeId: number): Promise<any> {
    // ASIGURĂ-TE CĂ AI "return" AICI:
    return this.request(`/api/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcomeId }),
    });
  }
  async archiveMarket(marketId: number): Promise<any> {
    return this.request(`/api/markets/${marketId}/archive`, {
      method: "POST",
    });
  }

  async generateApiKey(): Promise<{ apiKey: string }> {
    return this.request("/api/auth/generate-api-key", { method: "POST" });
  }
}




export const api = new ApiClient(API_BASE_URL);
