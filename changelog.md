v1.0.0 (Phase 1 Complete)

- Money on Register (Arqueo Inicial, Saldo en Tiempo Real y Conciliación):
  - Added initial funds declaration modal (OpenRegisterModal) for cash drawer change and bank funds upon register opening.
  - Added real-time tracking of physical cash drawer balance and digital/bank balance on Dashboard.
  - Strictly restricted live balances to Owner Mode (completely omitted from the screen in Modo Caja).
  - Added comprehensive "Arqueo & Fondos de Caja" reconciliation section in RegisterReport to compare initial funds + movements against physical money to count.
- In-App Interactive Guide System:
  - Added streamlined 4-tab "Guía del Sistema" (GuideModal) with single-row navigation (Caja & Cierres, Ventas & Libreta, Proveedores & Gastos, Seguridad & Reportes).
  - Integrated Guide trigger directly into the Account Menu and modernized the floating helper button.
- Time-Based Analytics & Granular Reports System:
  - Backend aggregation engine (analytics.py & GET /api/business/analytics/) with Argentina timezone conversion.
  - Interactive 24-hour hourly activity visualizer with peak trading hour badge and hover tooltips.
  - Generic dayparts breakdown (Mañana 06-13h, Tarde 13-18h, Noche 18-02h) showing relative revenue share and transaction volume.
  - Periodic granular filtering: Hoy (single-day navigation), Esta Semana, Este Mes, and Personalizado (custom date range).
  - Detailed financial breakdown: Total income, Expenses & supplier payments, Net balance, Average ticket ("Promedio por Venta"), and payment methods share (Cash, Transfer, Card, Fiado).
  - Added dedicated Reports & Analytics page (/analytics) in Sidebar guarded behind Owner PIN in Modo Caja.
- UI & Polish:
  - Streamlined Sidebar padding and added slim themed custom scrollbars matching Light/Dark themes.

v0.9.0

- Cash Register & Error Correction:
  - Added "Reabrir último cierre" flow to unseal the immediate last closed shift to fix errors or missing expenses without breaking audit trails.
  - Added Owner-guarded Edit Transaction modal (EditTransactionModal) with client autocomplete, operation modifications, and split payment adjustments.
  - Added Reopen action directly on the latest closed register report.
- UI & Polish:
  - Fixed active navigation indicator glint for "Nueva venta" in sidebar.

v0.8.0

- Security & Device Permissions:
  - Added Device Security Context with Kiosk Mode (Modo Caja) vs Owner Mode (Equipo Dueño).
  - PIN modal with numeric keyboard support, auto-lock security timer, and autofill prevention.
  - Added PIN change modal requiring current PIN authorization before updating.
- Cash Register & Ghost Transfers:
  - Implemented ghost transfers resolution workflow in register reports (Confirm, Convert to client tab, or Void).
  - Enforced register protection on closure, deletions, and historical views.
- Clients & Debt Settlement:
  - Full client tab & debt ledger tracking with support for notebook migration (initial debt).
  - Direct debt collection workflow with one-click full pay and partial payment modal on client page.
  - Strict validation requiring client assignment for any "Fiado" transaction.
- Providers & Expenses:
  - Added inline on-the-fly provider creation in movement modal.
  - Added provider debt tracking ("Debo") badges and detail overview KPI cards.
- UI/UX & Design Overhaul:
  - Refined slick, sharp UI palette (Indigo & Slate) with Light/Dark toggle and purged emojis.
  - Redesigned New Transaction page with prioritized sales flow and unconstrained operations.
  - Dynamic transaction card titles based on operations, clients, and custom notes with deduplication.
  - Added MoneyInput component with Argentine currency thousands formatting (no decimals) and disabled mouse-wheel increment.

v0.7.0

-implement clients
-implement providers
-implement transactions
-implement registers
-implement reports for closed registers
-setup sidebar layout
-add help guide

v0.1.1

-basic frontend imported from market-manager
-basic token email/pass auth system imported from market manager

v0.1.0

-initialize project files