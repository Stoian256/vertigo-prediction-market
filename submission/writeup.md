Design Choices & UI/UX Improvements
My primary goal for the frontend was to elevate the application from a basic form-based interface to a modern, 
low-friction "Trading Terminal" experience, similar to real-world financial exchanges.

1. Data Visualization over Raw Text
   Instead of forcing users to read raw percentage numbers, I implemented visual indicators. 
   The dashboard market cards feature horizontal "battle bars" that instantly show the ratio between the top two outcomes.
    On the market details page, I integrated Recharts to display a dynamic pie chart of the betting pool distribution. 
    This allows users to process market sentiment instantly.

2. Frictionless Betting Experience
   I redesigned the Market Detail page using an asymmetrical layout. The right side features a sticky "Trading Slip" that remains visible while scrolling. 
   To reduce user friction, I added quick-bet buttons (+10, +50, +100) and a real-time potential payout calculator that updates dynamically as the user types their bet amount.

3. Unified API Architecture (Bonus Task)
   For the requirement to allow bots to place bets programmatically, I chose not to duplicate the backend routes. 
    Instead, I upgraded the existing authentication middleware. It now intercepts the Authorization header and dynamically checks if the token is a standard user JWT or a Developer API Key (identifiable by a 'pk_' prefix). 
   This architectural choice allowed 100% of the existing application endpoints to support programmable bots instantly, securely, and consistently.

Challenges Faced & Technical Pivots
1. State Synchronization (The Balance Update Issue)
   Early in development, I encountered an issue where resolving a market correctly distributed funds in the database, 
  but the frontend React state still displayed the stale balance cached in local storage. 
  This forced users to manually log out and log back in to see their winnings. 
   I solved this by refactoring the backend resolution handlers to query and return the admin's freshly updated balance upon success.
  The frontend API client was then updated to intercept this new balance and silently update the global AuthContext, creating a seamless experience without page reloads.

2. Real-Time Updates: The WebSocket Journey
   The cross-cutting requirement mandated that the dashboard and user profile reflect new bets and odds changes within a few seconds without requiring a page refresh.

My initial technical approach was to implement WebSockets using the Elysia WebSocket plugin. 
The goal was to establish a persistent, bidirectional connection to minimize server load and push updates instantly to all connected clients. 
However, during implementation, I encountered a severe "Dependency Hell" issue. There were underlying versioning conflicts between the Elysia core framework and its external plugin ecosystem within the Bun environment,
which resulted in unresolvable syntax errors and server crashes.

As a junior developer, I had to evaluate the risk of not having a functional project versus delivering a stable product. 
I made the pragmatic decision to roll back the experimental WebSocket implementation.
In its place, I implemented a robust background short-polling mechanism that queries the server every 5 seconds. 
This solution completely fulfills the business requirement of seamless background UI updates, but more importantly, 
it guarantees 100% application stability.
In a production environment, migrating to a stable WebSocket release or Server-Sent Events (SSE) would be the natural next step for scaling.