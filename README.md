# QueuePro — Next.js

Live Queue dashboard built from the QueuePro design system (Helvetica, navy chrome, brand blue #1D74FD).

```bash
npm install
npm run dev   # http://localhost:3000
```

- `app/globals.css` — all design tokens (CSS variables)
- `components/ui/` — design-system primitives (Button, Badge, StatCard, QueueTable, TicketCard, …)
- `components/dashboard/` — TopBar, Sidebar, LiveQueue, Analytics cards
- `lib/data.ts` — mock queue + staff data (swap for your API)
- Icons: `lucide-react`

Interactions: filter tabs, Add Customer, click **Up Next** to call the next customer, location switcher, live clock.
