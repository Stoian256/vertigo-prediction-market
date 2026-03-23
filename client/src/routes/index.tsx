import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
// State for data

  const [markets, setMarkets] = useState<Market[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// State for filters, sorting, and pagination

  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState<"newest" | "pool" | "participants">("newest");



  const loadMarkets = async (showLoadingState = true) => {

    try {

      if (showLoadingState) setIsLoading(true);

      setError(null);



// Call the updated API method with the new parameters

      const response = await api.listMarkets(status, page, sortBy);



// Update state with the nested data

      setMarkets(response.data);

      setTotalPages(response.pagination.totalPages);

    } catch (err) {

      setError(err instanceof Error ? err.message : "Failed to load markets");

    } finally {

      setIsLoading(false);

    }

  };



// Run when filters, page, or sort changes

  useEffect(() => {

    loadMarkets();

  }, [status, page, sortBy]);



// REAL-TIME UPDATES: Poll the server every 5 seconds (update quietly in background)

  useEffect(() => {

    if (!isAuthenticated) return;

    const interval = setInterval(() => {

      loadMarkets(false);

    }, 5000);

    return () => clearInterval(interval);

  }, [status, page, sortBy, isAuthenticated]);



  if (!isAuthenticated) {

    return (

        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">

          <div className="text-center">

            <h1 className="text-4xl font-bold mb-4 text-gray-900">Prediction Markets</h1>

            <p className="text-gray-600 mb-8 text-lg">Create and participate in prediction markets</p>

            <div className="space-x-4">

              <Button onClick={() => navigate({ to: "/auth/login" })}>Login</Button>

              <Button variant="outline" onClick={() => navigate({ to: "/auth/register" })}>

                Sign Up

              </Button>

            </div>

          </div>

        </div>

    );

  }



  return (

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Header */}





          {/* Controls Bar: Filters & Sorting */}

          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">

            <div className="flex gap-2">

              <Button

                  variant={status === "active" ? "default" : "outline"}

                  onClick={() => { setStatus("active"); setPage(1); }}

              >

                Active

              </Button>

              <Button

                  variant={status === "resolved" ? "default" : "outline"}

                  onClick={() => { setStatus("resolved"); setPage(1); }}

              >

                Resolved

              </Button>

            </div>



            <div className="flex gap-2 items-center bg-white p-1 rounded-md shadow-sm border border-gray-200">

              <span className="text-sm text-gray-600 font-medium px-2">Sort by:</span>

              <select

                  className="border-none bg-transparent outline-none cursor-pointer text-sm font-medium pr-2"

                  value={sortBy}

                  onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}

              >

                <option value="newest">Newest First</option>

                <option value="pool">Largest Pool</option>

                <option value="participants">Most Participants</option>

              </select>

            </div>

          </div>



          {/* Error State */}

          {error && (

              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-6">

                {error}

              </div>

          )}



          {/* Markets Grid */}

          {isLoading ? (

              <Card><CardContent className="flex justify-center py-12 text-muted-foreground">Loading markets...</CardContent></Card>

          ) : markets.length === 0 ? (

              <Card><CardContent className="flex justify-center py-12 text-muted-foreground">No markets found.</CardContent></Card>

          ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                {markets.map((market) => (

                    /* Am adăugat acest wrapper div clickabil */

                    <div

                        key={market.id}

                        onClick={() => navigate({ to: `/markets/${market.id}` })}

                        className="cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-indigo-500/50 rounded-xl h-full flex"

                    >

                      {/* Flex-1 ajută cardul să ocupe tot spațiul wrapper-ului */}

                      <div className="flex-1 pointer-events-none">

                        <MarketCard market={market} />

                      </div>

                    </div>

                ))}

              </div>

          )}



          {/* Pagination Controls */}

          {!isLoading && totalPages > 1 && (

              <div className="flex justify-center items-center gap-4 mt-8 bg-white py-3 px-6 rounded-full shadow-sm border border-gray-200 w-fit mx-auto">

                <Button

                    variant="ghost"

                    size="sm"

                    disabled={page === 1}

                    onClick={() => setPage((p) => Math.max(1, p - 1))}

                >

                  ← Previous

                </Button>

                <span className="text-sm font-semibold text-gray-700">

Page {page} of {totalPages}

</span>

                <Button

                    variant="ghost"

                    size="sm"

                    disabled={page === totalPages}

                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}

                >

                  Next →

                </Button>

              </div>

          )}

        </div>

      </div>

  );

}



export const Route = createFileRoute("/")({

  component: DashboardPage,

});