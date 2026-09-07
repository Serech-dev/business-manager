v1.3.0 (Phase 2 - Stock Control, Smart Inventory & Provider Hub)

- Stock Control & Smart Inventory Module (Módulo de Control de Stock v1):
  - Real-time automated stock decrement on sales with support for discrete units and fractional weights (Kg, 100g).
  - Out-of-stock indicators and low stock warnings across product catalog and stock dashboard (default minimum stock warning set to 1).
  - Smart restock batch entry modal (`RestockModal.jsx`) supporting multi-product restock batches, provider assignment, cost price updates, and payment method allocation.
  - Quick stock adjustment modal (`StockAdjustModal.jsx`) with preset audit reasons (Rotura, Vencimiento, Pérdida, Conteo físico, Donación, Consumo interno).
  - Complete stock movements ledger (`/stock-movements`) with date filtering, provider tags, movement type classification, and search.
  - Intelligent stock insights & forecasts (`/stock-insights`) for fast-depleting inventory and restock forecasting.
  - Collaborative stock notes / shopping list (`StockNotes.jsx`) with quick completion checkboxes.
  - Employee security lock: Stock management and manual inventory adjustments protected behind Owner Mode PIN in Modo Caja.
- High-Precision Relevance Search Engine:
  - Multi-word scoring algorithm (`productSearch.js`) prioritizing exact name matches, word prefixes, and category weights over substring noise.
  - Integrated consistently across Product Catalog, New Sale POS, Restock Modal, and Provider Product Linker.
- Multi-Rubro Starter Catalog Expansion:
  - Expanded base starter catalog to 716 realistic Argentine retail products across 6 presets (Kiosco 220+, Almacén 120+, Fiambrería 100+, Verdulería 75, Carnicería 80, Panadería 100+).
  - Added generic bulk bread by weight (*Pan Francés / Criollo por Kg*) and standardized EAN-13 barcodes with realistic 2026 ARS pricing.
- Provider Hub & Bulk Product Assignment:
  - Redesigned Provider Detail view (`ProviderDetail.jsx`) with initials avatar, click-to-call, and direct WhatsApp chat links.
  - 4 Key Performance Indicator (KPI) cards: Saldo Adeudado (Debo), Productos Asignados & Valuación de Stock a Costo, Compras en Caja Actual, and Historial Total.
  - 3 Segmented tabs: Productos Suministrados, Historial de Movimientos, and Información & Notas.
  - Backend bulk product-provider assignment endpoint (`POST /api/business/products/bulk-assign-provider/`) with atomic operations and multi-tenant security isolation.
  - Dual assignment workflows: Dedicated multi-select modal from Provider Detail (`AssignProductsToProviderModal.jsx`) and Floating selection bar action in Product List (`AssignProviderModal.jsx`).
- POS Sales UX & Interactive Onboarding:
  - Zero-click manual amount typing in New Sale.
  - Dominant transaction type banners and in-card cash change displays.
  - Interactive visual onboarding tours (`OnboardingTour.jsx`) guiding new users through Catalog, Sales, Cash Registers, and Analytics.

v1.2.0 (Phase 2 - Products Catalog & POS Thermal Tickets)

- Products & Inventory Module (Módulo de Productos & Categorías):
  - Added full product catalog with category classification, cost/sale price, profit margin %, stock, barcode, and active status.
  - Multi-unit pricing support: Unidad (`unit`), Kilogramo (`kg`), and 100 Gramos (`100g`) with automated fractional weight calculation.
  - Quick-start catalog importer (`import-starter/`) with common Argentine business items (bakery, deli, butcher, grocery).
  - Bulk price updater modal (percentage markup/markdown by category or across all products).
  - Bulk product deletion with multi-selection table toolbar.
  - Integrated inline Category and Provider management modals directly from the product creation/edit form (`+ Gestionar`).
  - Provider management dashboard with total supplier counter (`Proveedores (N)`) on main product view.
  - Owner PIN protection across catalog views, bulk operations, and Modo Caja lock screens.
- New Sale Integration & POS Cash Register UX:
  - Interactive product search with instant live filtering, barcode search, category pills, and itemized cart.
  - Weight & Gram calculator modal with quick presets (100g, 250g, 500g, 1kg) and budget-to-grams conversion.
  - Automatic cash change calculator (*"Vuelto"*) with standard banknote quick-add shortcuts ($2.000, $5.000, $10.000, $20.000).
  - Smart split payment auto-balancing.
  - Plug & Play hardware barcode scanner listener (USB/Bluetooth HID) with keystroke buffer detection.
- POS Thermal Ticket & Receipt Printing:
  - Authentic monospace thermal receipt formatting (`ReceiptTicket.jsx`) supporting 58mm and 80mm roll paper widths.
  - Itemized breakdowns for products (quantities, unit prices, weights, subtotals), multi-operation breakdowns, payment methods, and cash change details.
  - Realistic preview canvas with paper width selector (`58 mm` / `80 mm`) and inline editable store name persisted in `localStorage`.
  - Zero-margin print isolation styles (`@media print`) isolating `#printable-receipt` without browser headers or margins.
  - Space-efficient opt-in micro-switch toggle in the bottom checkout action bar to enable/disable post-sale ticket printing on demand.
  - On-demand "Ticket" reprint button on every transaction card on the home dashboard.
- Client Credit & UI Polish:
  - Renamed "Fiado" to "A cuenta" across the application.
  - Client credit balance (*"Saldo a favor"*) handling when debt overpayments occur.
  - PIN-protected debt balance editing.
  - Native browser auto-translation protection (`translate="no"`).
  - Performance optimization: stripped heavy backdrop-blur filters for fluid 60fps rendering on low-end hardware.

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