import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, MyBet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProfilePage() {
  const { isAuthenticated, user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const [activeBets, setActiveBets] = useState<MyBet[]>([]);
  const [resolvedBets, setResolvedBets] = useState<MyBet[]>([]);

  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);

  const [resolvedPage, setResolvedPage] = useState(1);
  const [resolvedTotalPages, setResolvedTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [isLoading, setIsLoading] = useState(true);

  const handleGenerateKey = async () => {
    try {
      const res = await api.generateApiKey();
      setApiKey(res.apiKey);
    } catch (err) {
      alert("Failed to generate key");
    }
  };

  const loadBets = async (status: "active" | "resolved", page: number, showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      const res = await api.getMyBets(status, page);
      if (status === "active") {
        setActiveBets(res.data);
        setActiveTotalPages(res.pagination.totalPages);
      } else {
        setResolvedBets(res.data);
        setResolvedTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to load bets", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and pagination changes
  useEffect(() => {
    if (!isAuthenticated) return;
    loadBets(activeTab, activeTab === "active" ? activePage : resolvedPage);
  }, [activeTab, activePage, resolvedPage, isAuthenticated]);

  // Real-time updates for ACTIVE bets only (every 5 seconds)
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "active") return;
    const interval = setInterval(() => {
      loadBets("active", activePage, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, activePage, isAuthenticated]);

  if (!isAuthenticated) {
    navigate({ to: "/auth/login" });
    return null;
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-2">{user?.username} ({user?.email})</p>
            </div>
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>Back to Dashboard</Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Button variant={activeTab === "active" ? "default" : "outline"} onClick={() => setActiveTab("active")}>
              Active Bets
            </Button>
            <Button variant={activeTab === "resolved" ? "default" : "outline"} onClick={() => setActiveTab("resolved")}>
              Resolved Bets
            </Button>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading bets...</p>
              ) : activeTab === "active" && activeBets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">You have no active bets.</p>
              ) : activeTab === "resolved" && resolvedBets.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">You have no resolved bets.</p>
              ) : (
                  <div className="space-y-4">
                    {(activeTab === "active" ? activeBets : resolvedBets).map((bet) => (
                        <div key={bet.id} className="p-4 border rounded-lg bg-white flex justify-between items-center shadow-sm hover:shadow transition-shadow">
                          <div>
                            <h3 className="font-semibold text-lg cursor-pointer hover:underline" onClick={() => navigate({ to: `/markets/${bet.market.id}` })}>
                              {bet.market.title}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              You bet <span className="font-bold">${bet.amount.toFixed(2)}</span> on <span className="font-bold">"{bet.outcome.title}"</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-2">Placed: {new Date(bet.createdAt).toLocaleString()}</p>
                          </div>

                          <div className="text-right">
                            {activeTab === "active" ? (
                                <>
                                  <p className="text-2xl font-bold text-primary">{bet.odds}%</p>
                                  <p className="text-xs text-muted-foreground">Current Odds</p>
                                </>
                            ) : (
                                <Badge variant={bet.won ? "default" : "destructive"} className={bet.won ? "bg-green-500 hover:bg-green-600" : ""}>
                                  {bet.won ? "WON" : "LOST"}
                                </Badge>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
              )}

              {/* Pagination */}
              {!isLoading && (activeTab === "active" ? activeTotalPages > 1 : resolvedTotalPages > 1) && (
                  <div className="flex justify-center gap-4 mt-8">
                    <Button
                        variant="outline"
                        disabled={(activeTab === "active" ? activePage : resolvedPage) === 1}
                        onClick={() => activeTab === "active" ? setActivePage(p => p - 1) : setResolvedPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="py-2 text-sm font-medium">
                  Page {activeTab === "active" ? activePage : resolvedPage} of {activeTab === "active" ? activeTotalPages : resolvedTotalPages}
                </span>
                    <Button
                        variant="outline"
                        disabled={(activeTab === "active" ? activePage : resolvedPage) === (activeTab === "active" ? activeTotalPages : resolvedTotalPages)}
                        onClick={() => activeTab === "active" ? setActivePage(p => p + 1) : setResolvedPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
              )}
            </CardContent>
          </Card>

          {/* --------------------------------------------------- */}
          {/* BONUS TASK: Developer API Section                   */}
          {/* --------------------------------------------------- */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">🤖 Developer API</h3>
            <p className="text-slate-400 mb-6 text-sm">
              Build trading bots! Use an API key to interact with the Prediction Market programmatically.
              Keep this key absolutely secret.
            </p>

            {apiKey ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-widest">Your Active Key</p>
                  <div className="bg-black p-4 rounded-md text-green-400 font-mono text-sm break-all border border-green-900/50">
                    {apiKey}
                  </div>
                  <p className="text-xs text-slate-500">
                    ⚠️ Copy this key now. For security reasons, you won't be able to see it again after leaving this page.
                  </p>
                </div>
            ) : (
                <Button
                    onClick={handleGenerateKey}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
                >
                  Generate New API Key
                </Button>
            )}
          </div>

        </div>
      </div>
  );
}

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});