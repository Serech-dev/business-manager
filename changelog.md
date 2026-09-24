v1.7.3 (Client Debt Filter & x/x Limit Display, Itemized Ticket Details, Register Close Overhaul & High-Contrast Modals)

- Client List Debt Filter & Unified Limit View (x/x):
  - Added filter pills ("Todos" / "Con deuda") with live count badges and a summary banner of total pending fiado balance.
  - Formatted debtor balances as `x/x` (`Debe: $actual / $máximo` or `Debe: $actual / Sin límite`), unifying debt and credit limit into a single high-contrast badge on all screen sizes.
  - Over-limit balances are prominently flagged with rose/red alert styling and descriptive tooltips.
- Itemized Sale Products Breakdown ("Ver detalle"):
  - Added expandable ticket breakdown (`TransactionItemsDetail.jsx`) across Dashboard (`TransactionCard.jsx`), Client History (`ClientDetail.jsx`), and Register Close Report (`RegisterReport.jsx`).
  - Stays collapsed by default (`Ver detalle (X artículos) ▾`) to keep dashboards and tables compact, expanding to reveal product names, weighable amounts (`kg`/`100g`), quantity × unit price, line subtotals, and manual unlisted amounts.
- Register Close Report Overhaul:
  - Elevated "Productos Vendidos" out of hidden tabs into a prominent top-level section right below the executive summary strip, displaying total units sold, critical stock alerts, and catalog items with remaining inventory.
  - 4-metric Net Movement strip including "Artículos vendidos" and renamed "Movimiento neto del turno" to "Movimiento neto de caja".
  - Replaced technical jargon with mundane Argentine merchant terminology for tabs: "Resumen de Caja", "Ventas y Movimientos", "Fiados y Proveedores".
  - Enforced structured sharp design system (`rounded-md`, 1px borders, zero emojis).
- High-Contrast Debt Limit Warning Modal:
  - Fixed unreadable yellow text in `DebtLimitAuthorizeModal.jsx` on light mode: replaced low-contrast `text-amber-500` with `text-amber-700 dark:text-amber-400` and deep slate text in alert box.
  - Defaulted breakdown to open so cashiers immediately see current debt, new sale debt, credit limit, and exact excess.

v1.7.2 (Smart $50 Cash Rounding, In-Cart Weight Price Editor, Clarified Fiado & Exchange Flows)

- Smart $50 Incremental Cash Rounding (Redondeo comercial a múltiplos de $50):
  - In Argentine cash retail, coins and change under $50 are obsolete. All transaction-related amounts now strictly round UP to the nearest multiple of 50 (`Math.ceil(val / 50) * 50`).
  - Applied to weighable product fractional subtotals (e.g., 235g of cheese or bread), utility service fees (Carga SUBE and Recarga Celular), money exchange commissions, card/fiado surcharges, manual amounts, and split remainder calculations.
  - Full consistency across desktop POS (`NewTransaction.jsx`), mobile POS (`SimplePos.jsx`), frontend currency helper (`roundUpTo50`), and backend models (`round_up_to_50`).
- In-Cart Price Editing & Weighable Price Modifier:
  - In-cart price edits now default to "Guardar en catálogo / producto" checked (`true`) by default across both desktop and mobile terminals, saving cashiers clicks when adjusting regular retail prices during sales.
  - Added interactive Price Adjuster directly inside the Weight dialog for weighable products (e.g., bread, cold cuts, cheese), updating subtotals and grams in real-time and syncing changes to the catalog upon confirmation.
  - Enabled "Editar precio" directly on weighable line items in the cart table for fast adjustments per kg or per 100g.
- Clarified Terminology & Payment Method Differentiation:
  - Renamed the "A cuenta" payment method back to "Fiado" across POS terminals, dropdowns, and badges to cleanly differentiate from debt collection transactions ("Cobro de Libreta / Pago a cuenta").
  - Clarified Money Exchange flows: explicitly labels exchange direction ("Efectivo por Transf.", "Transf. por Efectivo", and "Fiado"), dynamically reflecting operation context and balance summaries.
  - Retained "Fiado" as a valid payment option in money exchanges for trusted customer credit transfers.
- Split-Payment Surcharge & Remainder Enhancements:
  - Multi-method split payments now properly compute and apply the 10% fiado surcharge on the remaining balance.
  - Surcharges apply reliably to utility recharges (SUBE, Celular) and exchange operations when paid with Fiado or Card.
- Partial Debt Payments (Pagos Parciales de Libreta):
  - Added support in `ClientPaymentModal.jsx` for custom partial debt amortizations with quick percentage/amount suggestions.

v1.7.1 (Provider Debt Fix, Credit Limits, On-the-Fly Fiado Surcharge Toggle & Modal Performance Optimization)

- Provider Debt Purchases (Cuenta Corriente Proveedor):
  - Fixed 400 Bad Request error when registering purchases to providers on account (`type: "provider"`, `method: "debt"`).
  - Serializer validation now properly validates provider association instead of incorrectly enforcing a client.
- Global & Per-Client Fiado (Credit) Limits:
  - Added global credit limit setting in Store Settings (`global_debt_limit`).
  - Added per-client debt limit override in Client profile (`debt_limit`), with higher priority over the global limit.
  - POS warnings and owner authorization: checks projected debt before completing a sale on account. If exceeded, requires owner PIN authorization on kiosk/clerk terminals or confirmation prompt for owner sessions.
  - Added available credit headroom displays in Client balance cards and Client list table.
- Flexible Fiado Surcharge Toggle (Omitir / Aplicar Recargo):
  - Cashiers can now bypass the fiado surcharge on-the-fly (`[Omitir recargo]` / `[Aplicar recargo]`) for trusted customers in both desktop POS (`NewTransaction.jsx`) and mobile POS (`SimplePos.jsx`).
- Client State Reset Fix on "+ Nueva Venta":
  - Fixed issue where the previous customer's name persisted in the customer search input when clicking "+ Nueva Venta" from the receipt modal. Search input and dropdown are now cleanly reset when transitioning back to a new sale.
- Modal Performance Optimization for Older POS Hardware:
  - Eliminated GPU-heavy `backdrop-blur-*` filters across all modal overlays and bottom drawers in both desktop and mobile modes (replaced with solid alpha overlays `bg-black/70`), restoring smooth 60fps responsiveness on low-end Intel Celeron/Atom POS hardware.

v1.7.0 (Responsive Layouts, Autocomplete Search, Charm Crossover Pricing & UI Polish)

- Responsive Layouts & Low-Resolution Optimizations (1024px–1366px):
  - Consolidated `ProductList.jsx` action toolbar: grouped secondary actions into a clean "Más Opciones ▾" dropdown (Categories, Providers, Base Catalog, CSV Export), eliminating multi-row header button wrapping.
  - Refactored `ProductList.jsx` search and filter grid to a responsive 12-column layout with quick clear buttons.
  - Structured `StockManagement.jsx` Tab 1 ("Control de inventario") filters into a 2-tier card: top search/rubro/provider grid and bottom status pill filters with live count badges and counter.
  - Refactored Tab 2 ("Historial de compras & temporadas") and Tab 3 ("Notas & pedidos") filter bars for fluid wrapping on lower resolution laptop displays.
  - Strict Modern Structured Sharp design system: standardized on `rounded-md` (6px) micro-radii and 1px borders across all cards, panels, and buttons.
- Standardized Product Autocomplete Search (`ProductSelectSearch.jsx`):
  - Replaced endless scrolling select dropdowns in provider associations (`ProviderDetail.jsx`) and stock modals (`RestockModal.jsx`, `StockNoteModal.jsx`) with a type-to-search product selector that opens only upon user input.
- Store Configuration & Surcharges Consolidation (`StoreSettingsModal.jsx`):
  - Consolidated store configuration into 3 streamlined tabs ("Datos del Comercio", "Comisiones y Recargos", "Cuentas y Billeteras").
  - Fixed tab header border alignment and z-index stacking, preventing scrolling content from overlapping tab titles.
  - Suppressed phantom scrollbars on tab bars using `.no-scrollbar` utility.
  - Updated surcharges and fees to colloquial Argentine merchant terminology.
- Yearly Subscription Crossover Pricing:
  - Added psychological monthly strikethrough crossover pricing on yearly plans (`~~$118.800~~ $99.000` / `~~$238.800~~ $199.000`) across `SubscriptionModal.jsx`, `PlanComparisonTable.jsx`, and `SubscriptionExpiredOverlay.jsx`.

v1.6.0 (Modo Simple Mobile PWA - BETA, In-App Notifications & Subscription Tiers)

- Modo Simple & Progressive Web App (PWA - BETA):
  - Dedicated mobile PWA with manifest, service worker (`vite-plugin-pwa`), touch icon presets, and standalone app display.
  - Tactile mobile Point of Sale terminal (`SimplePos.jsx`) featuring fluid multi-service ribbon (`+ Varios $`, `Carga SUBE`, `Recarga Celular`, `Cambio $`, `Cobro A Cuenta`).
  - Unified multi-service ticket: seamlessly blend products, weighable items (with custom grams picker), arbitrary custom amounts, utility recharges, money exchange, and debt collections into a single sale.
  - Floating bottom checkout drawer with fast bill shortcuts (`Exacto`, `+$1.000`, `+$2.000`, `+$5.000`, `+$10.000`, `+$20.000`), live change calculation, and post-sale WhatsApp receipt sharing.
  - Integrated mobile camera barcode scanner (`MobileCameraScanner.jsx`) with laser viewfinder target, instant beep/haptic feedback, catalog auto-recognition, and graceful camera error handling.
  - Dedicated Mobile Control Hub (`SimpleMoreHub.jsx`) replacing nested dropdowns with a structured 2x3 module grid, merchant hero card, inline theme selector, and business settings.
  - Responsive dropdown & drawer containment: bounds `NotificationMenu` and `AccountMenu` to mobile screen viewports without overflowing.
- In-App Real-Time Notification Center:
  - Header notification bell with badge counters, unread filters, and single-click dismiss actions (`NotificationMenu.jsx`).
  - Automated proactive alerts for low stock / out-of-stock items, license expiration countdowns (3 days / 1 day / expired), and overnight active cash register reminders.
- PRO Subscription Tiers & Charm Pricing:
  - Psychological charm pricing structure (.900 / .000 / .900 / .000).
  - Dynamic tier-based avatar gradient indicators (PRO, Trial, Básico, Lifetime, Superadmin) across all menus.
  - Superadmin owner panel subscription action management and ISO datetime parsing fixes.

v1.5.0 (Phase 2 - Hardware Barcode Scanner, Master National Catalog & Auto-Recognition)

- Hardware Barcode Reader Integration (HID Keyboard Emulation):
  - Zero-focus instant cart addition: Scanning barcodes anywhere on the POS / Cashier screen (`NewTransaction.jsx` / `SaleProductSelector.jsx`) adds products directly without requiring manual focus on the search box.
  - High-resilience keystroke buffer with rapid scanner detection (<100ms inter-character interval) and automatic buffer resets on pauses.
  - Silenced software audio feedback (`audio.js`) to eliminate duplicate sound alerts, keeping physical scanner hardware beeps clean.
- Master National Argentine Retail Barcode Catalog (0ms Offline Zero-Latency):
  - Comprehensive, 100% offline client-side and backend catalog (`nationalCatalog.js` + `starter_catalog.py`) with 1,088 products across 8 core Argentine rubros and 959 verified GS1 EAN-13 barcodes.
  - Expanded coverage for economy, neighborhood, and corner-case brands (Tés Crysf, Galletitas Gaona/Trio/Fachitas/Dulcipan, Gaseosas Secco/Cunnington/Manaos/Pritty, Alfajores Fulbito/Grandote/Escolar, Krachitos, Softys/Elite/Higienol/Sussex, etc.).
  - Automatic product identification across food, drinks, bakery, butcher, deli, produce, cleaning, and pet supplies.
  - Django database ingestion command (`manage.py ingest_master_catalog`) for bulk loading master catalog entries into `MasterCatalogProduct`.
- Smart Duplicate Name Resolution & 1-Click Addition:
  - When scanning an uncataloged barcode for a product that already exists under that name (e.g. imported earlier or entered manually without a barcode), automatically updates and binds the barcode to the existing product instead of failing with a 400 duplicate name error.
  - 1-click POS modal action: «Agregar a mi catálogo y sumar a la venta» / «Actualizar código de [Producto] y sumar a la venta».
  - Product creation form (`ProductModal.jsx`) seamlessly auto-populates National Catalog data on scan and resolves duplicate name collisions safely.
  - Re-importing starter presets (`import_starter_catalog_for_user`) backfills missing EAN-13 barcodes on existing user products.
- POS Sales UX & Clean Interface Polish:
  - In-cart unit price quick-edit button (`[✏️ Editar precio]`) with optional "Guardar en catálogo" checkbox to update shelf prices immediately.
  - Custom themed SVG checkboxes eliminating Windows OS native white-box graphics.
  - Styled `<select>` dropdown controls with custom SVG chevrons across modals (`BarcodeNotFoundModal.jsx`, `ImportCatalogModal.jsx`).
  - Streamlined POS search: removed category filter pills and eliminated dropdown popup on empty query for a completely clean, unobstructed cart view.


v1.4.0 (Phase 2 - Virtual Licensing, Automated Mercado Pago Checkout & UX Polish)

- Virtual Licensing & Automated Checkout Gateway (Módulo de Licencias Virtuales v1):
  - Full Mercado Pago Checkout Pro integration (`createCheckoutPreference`, `VerifyPaymentStatusView`, `MercadoPagoWebhookView`) supporting Monthly and Yearly licensing plans.
  - In-modal dynamic QR Code generation with `qrcode.react` for direct mobile phone checkout, alongside dedicated "Abrir en nueva pestaña" action.
  - Real-time 4-second background accreditation polling (`refreshSubscription`) with instant screen unblocking upon payment approval.
  - Enriched Mercado Pago preference payloads (store branding, product icons, descriptions, and category identification).
  - Dynamic 7-day free trial on signup, expiration countdown badges, and persistent lifetime superuser access.
  - Enhanced `LoginSerializer` supporting authentication via either email or username.
- Store Configuration & First-Time Onboarding:
  - 3-step first-time setup wizard (`FirstTimeSetupModal.jsx`) covering store identity, service commission rates (money exchange, SUBE, phone recharges), and credit surcharge (fiado).
  - Standardized Argentine currency whole-number values (removed decimal steps from fee and money inputs).
  - Cleaned setup toast feedback: single crisp success notification (`"¡Tu comercio está listo!"`) on completion and zero noise on skip (`"Omitir por ahora"`).
  - Modernized dropdown controls: replaced native OS white-box controls with custom `appearance-none` containers and themed SVG chevrons.
- Security & Expired State Polish:
  - Global suppression of cascading 403 error toasts on license expiration, keeping user focus on the clean `SubscriptionExpiredOverlay`.
  - Immediate dismissal of expired screen overlays and full context state reset upon user logout.
  - Added token and route guards preventing modals and overlays from mounting on `/login` and `/register`.

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
  - Interactive visual onboarding tours (`OnboardingTour.jsx`) guiding users across Catalog, Stock Control, Providers Hub, Sales, Cash Registers, and Analytics.

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