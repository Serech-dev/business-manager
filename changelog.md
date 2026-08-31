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