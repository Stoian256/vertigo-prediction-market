import { HeadContent, Scripts, createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

// Componenta NotFound rămâne neschimbată
function NotFoundComponent() {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-gray-900">404</h1>
          <p className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</p>
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Home</a>
        </div>
      </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prediction Market" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
});

// Aceasta este componenta care "împachetează" totul
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
      <AuthProvider>
        <AppLayout>{children}</AppLayout>
        <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
        />
      </AuthProvider>
      <Scripts />
      </body>
      </html>
  );
}

// COMPONENTA NOUĂ: Aici definim Header-ul vizibil peste tot
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
      <div className="min-h-screen flex flex-col">
        {/* Header Global - se afișează doar dacă userul este logat */}
        {isAuthenticated && (
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20 flex items-center">
              <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate({ to: "/" })}
                >
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <span className="text-white font-black text-xs">PM</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">PredictIt</h1>
                </div>

                <div className="flex items-center gap-4">
                  {/* Wallet Display - Permanent pe orice pagină */}
                  <div className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-lg flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Balance</span>
                    <span className="text-lg font-bold text-green-600">
                  ${user?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                </span>
                  </div>

                  <div className="flex gap-2 border-l pl-4 border-slate-200">
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/leaderboard" })}>Leaderboard</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>Profile</Button>
                    <Button variant="destructive" size="sm" onClick={() => navigate({ to: "/auth/logout" })}>Logout</Button>
                  </div>
                </div>
              </div>
            </header>
        )}

        {/* Conținutul paginii */}
        <div className="flex-1">
          {children}
        </div>
      </div>
  );
}