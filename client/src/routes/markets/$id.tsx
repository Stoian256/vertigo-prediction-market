import { useEffect, useState } from "react";
import { useParams, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
// Import Recharts components
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Culori moderne pentru grafic
const COLORS = ['#6366f1', '#fb7185', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9'];

function MarketDetailPage() {
  const { id } = useParams({ from: "/markets/$id" });
  const navigate = useNavigate();

  const { isAuthenticated, user, updateBalance } = useAuth();

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const marketId = parseInt(id, 10);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMarket(marketId);
        setMarket(data);
        if (data.outcomes.length > 0) {
          setSelectedOutcomeId(data.outcomes[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load market details");
      } finally {
        setIsLoading(false);
      }
    };

    loadMarket();
  }, [marketId]);

  const handlePlaceBet = async () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Bet amount must be a positive number greater than 0.");
      return;
    }

    if (!selectedOutcomeId) {
      setError("Please select an outcome.");
      return;
    }

    try {
      setIsBetting(true);
      setError(null);

      const response = await api.placeBet(marketId, selectedOutcomeId, parseFloat(betAmount));

      if (response.newBalance !== undefined) {
        updateBalance(response.newBalance);
      }

      setBetAmount("");

      const updated = await api.getMarket(marketId);
      setMarket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  const handleResolve = async (outcomeId: number) => {
    if (!confirm("Are you sure you want to resolve this market? This will distribute funds and cannot be undone.")) return;

    try {
      setIsResolving(true);
      setError(null);

      const response = await api.resolveMarket(marketId, outcomeId);

      const updated = await api.getMarket(marketId);
      setMarket(updated);

      if (response && response.newBalance !== undefined) {
        updateBalance(response.newBalance);
      } else {
        window.location.reload();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market");
    } finally {
      setIsResolving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to ARCHIVE this market? All bets will be refunded to the users.")) return;

    try {
      setIsResolving(true);
      setError(null);
      const response = await api.archiveMarket(marketId);

      const updated = await api.getMarket(marketId);
      setMarket(updated);

      if (response && response.newBalance !== undefined) {
        updateBalance(response.newBalance);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive market");
    } finally {
      setIsResolving(false);
    }
  };

  // Quick Bet Function
  const addBetAmount = (amount: number) => {
    setBetAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + amount).toString();
    });
  };

  if (!isAuthenticated) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Card className="shadow-lg border-0">
            <CardContent className="flex flex-col items-center justify-center py-16 px-12 gap-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <p className="text-xl font-medium text-slate-700">Please log in to trade in this market</p>
              <Button size="lg" className="w-full text-md" onClick={() => navigate({ to: "/auth/login" })}>Login to Continue</Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="animate-pulse text-indigo-600 font-semibold text-lg">Loading market data...</p></div>;
  if (!market) return <div className="min-h-screen flex items-center justify-center"><p className="text-rose-500 font-bold text-xl">Market not found</p></div>;

  const chartData = market.outcomes.map(outcome => ({
    name: outcome.title,
    value: outcome.totalBets
  })).filter(data => data.value > 0);

  // Calculăm profitul potențial
  const selectedOutcome = market.outcomes.find(o => o.id === selectedOutcomeId);
  const numAmount = parseFloat(betAmount) || 0;
  const potentialPayout = selectedOutcome && selectedOutcome.odds > 0
      ? numAmount / (selectedOutcome.odds / 100)
      : 0;

  return (
      <div className="min-h-screen bg-slate-50 pb-12 pt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Top Navigation */}
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 pl-0" onClick={() => navigate({ to: "/" })}>
            ← Back to Markets
          </Button>

          {/* Error Alert */}
          {error && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 shadow-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                {error}
              </div>
          )}

          {/* Main Layout: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT COLUMN: Market Details & Data (Takes up 8/12 columns) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Header Card */}
              <Card className="border-0 shadow-sm bg-white overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    {market.status === "active" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none flex items-center gap-1.5 px-3 py-1 text-sm shadow-sm hover:bg-emerald-200">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                        </span>
                          Live Market
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="px-3 py-1 text-sm bg-slate-100 text-slate-600">
                          {market.status === "resolved" ? "Resolved" : "Archived"}
                        </Badge>
                    )}
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm font-semibold text-slate-600">
                      Total Volume: <span className="text-slate-900">${market.totalMarketBets.toFixed(2)}</span>
                    </div>
                  </div>
                  <CardTitle className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
                    {market.title}
                  </CardTitle>
                  {market.description && (
                      <CardDescription className="text-base text-slate-600 mt-4 leading-relaxed">
                        {market.description}
                      </CardDescription>
                  )}
                </CardHeader>
              </Card>

              {/* Outcomes List */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 px-1">Order Book / Odds</h3>
                <div className="grid gap-3">
                  {market.outcomes.map((outcome) => {
                    const isSelected = selectedOutcomeId === outcome.id;
                    return (
                        <div
                            key={outcome.id}
                            onClick={() => market.status === "active" && setSelectedOutcomeId(outcome.id)}
                            className={`group p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex justify-between items-center ${
                                isSelected
                                    ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-4 ring-indigo-500/10"
                                    : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                            } ${market.status !== "active" && "cursor-default opacity-80"}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                              {isSelected && <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>}
                            </div>
                            <div>
                              <h4 className={`font-bold text-xl ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {outcome.title}
                              </h4>
                              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                                Pool: ${outcome.totalBets.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-3xl font-black tracking-tight ${isSelected ? 'text-indigo-600' : 'text-slate-700 group-hover:text-indigo-500'}`}>
                              {outcome.odds}%
                            </p>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart */}
              <Card className="border-0 shadow-sm bg-white mt-6">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-900">Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] w-full flex items-center justify-center">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Volume']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">📊</div>
                          <p className="text-slate-500 font-medium">No volume yet. Be the first to trade!</p>
                        </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN: Betting Slip & Admin Controls (Takes up 4/12 columns) */}
            <div className="lg:col-span-4">
              <div className="sticky top-6 space-y-6">

                {/* --- BETTING SLIP --- */}
                {market.status === "active" && (
                    <Card className="border border-indigo-100 shadow-xl shadow-indigo-100/50 bg-white overflow-hidden">
                      <div className="bg-indigo-600 text-white px-6 py-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Trading Slip
                        </h3>
                      </div>

                      <CardContent className="p-6 space-y-6">

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm mb-1">
                            <Label className="text-slate-500 font-medium">Selected Outcome</Label>
                            <span className="text-indigo-600 font-bold">{selectedOutcome?.odds || 0}%</span>
                          </div>
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-center">
                            {selectedOutcome?.title || "Select an outcome first"}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="betAmount" className="text-slate-500 font-medium">Amount to Trade ($)</Label>
                          <Input
                              id="betAmount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={betAmount}
                              onChange={(e) => setBetAmount(e.target.value)}
                              placeholder="0.00"
                              disabled={isBetting}
                              className="text-2xl font-bold py-6 text-center border-slate-300 focus-visible:ring-indigo-500"
                          />

                          {/* Quick Bet Buttons */}
                          <div className="grid grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" type="button" className="text-xs font-bold bg-slate-50 hover:bg-slate-100" onClick={() => addBetAmount(10)}>+10</Button>
                            <Button variant="outline" size="sm" type="button" className="text-xs font-bold bg-slate-50 hover:bg-slate-100" onClick={() => addBetAmount(50)}>+50</Button>
                            <Button variant="outline" size="sm" type="button" className="text-xs font-bold bg-slate-50 hover:bg-slate-100" onClick={() => addBetAmount(100)}>+100</Button>
                            <Button variant="outline" size="sm" type="button" className="text-xs font-bold bg-slate-50 hover:bg-slate-100" onClick={() => addBetAmount(500)}>+500</Button>
                          </div>
                        </div>

                        {/* Potential Return UI */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex justify-between items-center">
                          <span className="text-sm font-semibold text-emerald-800">Potential Payout</span>
                          <span className="text-xl font-black text-emerald-600">${potentialPayout.toFixed(2)}</span>
                        </div>

                        <Button
                            className="w-full text-lg py-6 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                            onClick={handlePlaceBet}
                            disabled={isBetting || !selectedOutcomeId || !betAmount}
                        >
                          {isBetting ? "Processing..." : "Submit Trade"}
                        </Button>
                      </CardContent>
                    </Card>
                )}
                {/* --- END BETTING SLIP --- */}

                {/* --- ADMIN PANEL --- */}
                {user?.role === "admin" && market.status === "active" && (
                    <Card className="border-2 border-rose-200 bg-rose-50/50 shadow-sm">
                      <CardHeader className="pb-3 border-b border-rose-100 bg-rose-50">
                        <CardTitle className="text-rose-800 text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                          👑 Admin Terminal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 pt-4">
                        <p className="text-xs text-rose-600/80 font-medium">Select winner to close market & distribute funds.</p>

                        <div className="space-y-2">
                          {market.outcomes.map((outcome) => (
                              <Button
                                  key={`admin-${outcome.id}`}
                                  variant="default"
                                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm justify-between shadow-sm"
                                  disabled={isResolving}
                                  onClick={() => handleResolve(outcome.id)}
                              >
                                <span>Resolve "{outcome.title}"</span>
                                <span>🏆</span>
                              </Button>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-rose-200">
                          <Button
                              variant="outline"
                              className="w-full bg-white border-amber-400 text-amber-700 hover:bg-amber-50 hover:border-amber-500 text-xs font-bold"
                              disabled={isResolving}
                              onClick={handleArchive}
                          >
                            ⚠️ ARCHIVE & REFUND
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                )}
                {/* --- END ADMIN PANEL --- */}

              </div>
            </div>

          </div>
        </div>
      </div>
  );
}

export const Route = createFileRoute("/markets/$id")({
  component: MarketDetailPage,
});