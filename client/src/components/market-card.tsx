import { Market } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  // Extragem primele două opțiuni pentru bara vizuală de "luptă" (Da vs Nu)
  const option1 = market.outcomes[0];
  const option2 = market.outcomes[1];


  const creatorInitial = market.creator ? market.creator.charAt(0).toUpperCase() : "U";

  return (
      <Card className="flex flex-col h-full bg-white transition-all duration-300 group border-slate-200 shadow-sm overflow-hidden">

        <CardHeader className="pb-3 gap-2">
          <div className="flex items-start justify-between">
            {market.status === "active" ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none shadow-sm flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
                  Active
                </Badge>
            ) : (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                  Resolved
                </Badge>
            )}

            {/* Volumul Total scos în evidență sus */}
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              Pool: ${market.totalMarketBets.toFixed(2)}
            </div>
          </div>

          <div>
            {/* Titlul cu hover effect */}
            <CardTitle className="text-xl font-bold leading-tight text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
              {market.title}
            </CardTitle>

            {/* Creatorul cu mini-avatar */}
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] text-white font-bold shadow-sm">
                {creatorInitial}
              </div>
              Created by <span className="font-medium text-slate-700">{market.creator || "Unknown"}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col pt-2 pb-6 space-y-6">

          {/* BARA DE PROGRES VIZUALĂ (Dacă există cel puțin 2 opțiuni) */}
          {option1 && option2 && (
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-sm font-bold px-1">
                  <span className="text-indigo-600">{option1.title} {option1.odds}%</span>
                  <span className="text-rose-500">{option2.odds}% {option2.title}</span>
                </div>
                {/* Bara propriu-zisă */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                      className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                      style={{ width: `${option1.odds}%` }}
                  />
                  <div
                      className="h-full bg-rose-400 transition-all duration-1000 ease-out"
                      style={{ width: `${option2.odds}%` }}
                  />
                </div>
              </div>
          )}

          {/* LISTA DETALIATĂ A OPȚIUNILOR (Cu un design mai curat) */}
          <div className="space-y-2.5">
            {market.outcomes.map((outcome, index) => {
              // Dăm culori dinamice primelor 2 opțiuni ca să se asorteze cu bara de progres
              const isFirst = index === 0;
              const isSecond = index === 1;

              return (
                  <div
                      key={outcome.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isFirst ? "bg-indigo-50/30 border-indigo-100" :
                              isSecond ? "bg-rose-50/30 border-rose-100" :
                                  "bg-slate-50 border-slate-100"
                      }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{outcome.title}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        ${outcome.totalBets.toFixed(2)} pool
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                          isFirst ? "text-indigo-600" :
                              isSecond ? "text-rose-500" :
                                  "text-slate-600"
                      }`}>
                        {outcome.odds}%
                      </p>
                    </div>
                  </div>
              )
            })}
          </div>
        </CardContent>

        {/* FOOTER INTERACTIV (Înlocuiește vechiul Button) */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 text-sm font-bold text-slate-500 group-hover:bg-primary group-hover:text-white transition-all duration-300 text-center uppercase tracking-wider">
          {market.status === "active" ? "Place Bet" : "View Results"}
        </div>
      </Card>
  );
}