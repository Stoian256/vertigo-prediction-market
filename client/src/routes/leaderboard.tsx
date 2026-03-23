import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api, LeaderboardEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        setLeaders(data);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Leaderboard</h1>
              <p className="text-gray-600 mt-2">Top predictors by total winnings</p>
            </div>
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              Back to Dashboard
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                  <p className="text-center py-12 text-muted-foreground">Loading top predictors...</p>
              ) : leaders.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No winnings recorded yet. Be the first to win!</p>
              ) : (
                  <div className="divide-y">
                    {leaders.map((user, index) => (
                        <div key={user.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-200 text-gray-700' :
                                    index === 2 ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-500'}`}
                            >
                              #{index + 1}
                            </div>
                            <h3 className="font-semibold text-lg">{user.username}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              ${user.totalWinnings.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Won</p>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});