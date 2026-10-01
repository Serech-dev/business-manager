# Business Manager - Project Guidelines & Design System Rules

## 1. Design System & Aesthetics (Option 1 - Modern Structured Sharp)
- **Sharp & Structured Corners**:
  - Main containers, cards, tables, panels, and modals must use crisp, tight micro-radii: **`rounded-md`** (6px) or **`rounded-sm`** (2px/4px) or **`rounded`** (4px).
  - Buttons, inputs, search bars, badges, and dropdown menus must use **`rounded-md`** or **`rounded-sm`**.
  - **Strictly Prohibited**: Never use bubbly/soft `rounded-xl`, `rounded-2xl`, `rounded-3xl`, or large pill shapes in standard desktop/web UI.
  - *Note*: Soft, large, bubbly touch targets are strictly reserved for a future dedicated "Modo Simple / Kiosco Táctil".
- **Borders & Elevation**:
  - Always use crisp 1px borders (`border border-[var(--border)]`). Avoid thick 2px borders on standard cards.
  - Elevated surfaces use `bg-[var(--surface)]`, `bg-[var(--surface-accent)]`, and subtle shadows (`shadow-xs` / `shadow-sm` / `shadow-xl` on modals).

## 2. Zero Native OS Graphics (No Windows / Browser Default Artifacts)
- **Checkboxes**:
  - Never render unstyled `<input type="checkbox">` which show native Windows white boxes and default checkmarks.
  - Always use custom accessible themed SVG checkboxes (e.g. `CustomCheckbox` component with `var(--primary)`, `var(--border)`, `var(--background)`, and crisp SVG checkmark icon).
- **Selects / Dropdowns**:
  - Never render unstyled `<select>` elements which show native OS white rectangular backgrounds.
  - Always wrap `<select>` in a relative container with `appearance-none`, custom themed padding, `bg-[var(--surface)]` or `bg-[var(--background)]`, `border-[var(--border)]`, and an absolute right-aligned SVG chevron icon.
- **Number Inputs**:
  - Always ensure spinner arrows are suppressed globally (configured in `index.css`).
- **Scrollbars & Inputs**:
  - Sleek thin scrollbars themed with `var(--border)` and `var(--primary)`.

## 3. Language & Terminology
- **Code & Assistant Interaction**: English (variable names, commit messages, agent responses, documentation).
- **UI & Merchant Terminology**: Argentine Spanish (e.g. "Caja", "Venta", "Libreta / A cuenta", "Recarga SUBE", "Cambio", "Fiambre", "Golosinas", "Rubro", "Vuelto", "Cierre de Caja").

## 4. Safety & Data Integrity
- In-cart price edits must give the cashier the option to either apply on-the-fly or save to catalog.
- Starter and Master catalog imports must never overwrite or destroy existing custom prices or user products.

## 5. Zero Emojis in UI (Clean & Professional Look)
- **Strictly Prohibited**: Never use emojis (such as 🎁, 🏷️, 📦, 🛒, 🚀, etc.) anywhere in the user interface, buttons, tables, badges, modals, tab headers, or alert messages.
- **Iconography**: Always use crisp, scalable inline SVG icons or clean typography. Emojis make the system look amateurish and unprofessional.

## 6. Core Product Philosophy & Category Taxonomy
- **Golden Rule**: **`ease of use > data clarity > slick look`**
  - The system is feature-rich and powerful; our primary goal is to **give merchants less work, not more**.
  - Minimize cognitive load, clicks, ambiguity, and cluttered dropdowns.
- **Default Generalist Categories**:
  - Keep catalog categories clean, simple, and generalist so any product has an obvious home:
    1. **Bebidas** (gaseosas, aguas, jugos, energizantes, cervezas, vinos, licores)
    2. **Golosinas & Snacks** (alfajores, chocolates, chicles, caramelos, papas fritas, galletitas dulces/saladas)
    3. **Almacén** (yerba, azúcar, café, fideos, arroz, harina, aceite, condimentos, conservas, salsas)
    4. **Fiambrería & Lácteos** (quesos, jamón, salame, fiambres, leche, yogur, manteca, tapas)
    5. **Panadería** (pan, medialunas, facturas, tortillas, prepizzas, sándwiches de miga)
    6. **Carnicería & Granja** (carne vacuna, patys/hamburguesas, pollo, cerdo, milanesas, huevos)
    7. **Verdulería & Frutería** (frutas y verduras: papas, tomates, cebollas, bananas, manzanas)
    8. **Limpieza** (lavandina, detergente, desinfectante, jabón para ropa, papel higiénico, rollos)
    9. **Perfumería & Higiene** (shampoo, desodorante, jabón de tocador, pasta dental, toallitas)
    10. **Cigarrillos & Tabaquería** (cigarrillos, tabaco para armar, encendedores, papelillos, filtros)
    11. **Mascotas** (alimento para perros y gatos, piedritas, accesorios)

## 7. Dual-Gate System (Subscription Tier & Device Security / Owner PIN)
- **Gate 1: Subscription Tier (Plan Básico vs. Plan Premium / PRO)**
  - **Plan Básico**: Core operations for single-operator stores (POS sales, \$50 rounding, weighables, utilities SUBE/Celular, currency exchange, catalog & combos, client fiado ledger with limits, basic inventory counting/alerts, daily register opening/closing, daily revenue summary in Dashboard).
  - **Plan Premium / PRO** (Gated by `RequiresFeature` in backend & `PremiumGate` in frontend):
    1. `employees`: Employee directory, roles, wage configuration (monthly, hourly, daily), attendance punch-clock, salary movements (advances, internal consumption, bonuses, penalties), payroll settlement modal, and cashier shift handovers with attribution.
    2. `provider_debts`: Provider directory, purchase ledger, debt tracking, and wholesale accounts payable.
    3. `advanced_reports`: Deep business analytics (`/analytics` - net real profit [sales - costs], category margins, peak sales hours, time series charts).
    4. `export_excel`: CSV/Excel downloads for catalogs, sales history, and register reports.
    5. `ticket_branding`: Custom thermal receipt header, store logo, CUIT, and footer messages.
- **Gate 2: Device Security & Access Control (Kiosk/Cashier Mode vs. Owner PIN)**
  - When a device is configured as `isKioskDevice` ("Terminal de Caja / Modo Empleado"):
    - **Cashier Free Access (No PIN required)**: Fast checkout, multi-method payment, weighable items, debt collections ('Cobro de Libreta'), cash change calculator, price lookup (selling price only), shift handover ('Entrega de Turno').
    - **Owner-Only (Strictly requires Owner PIN via `requireOwnerAccess`)**:
      - Register final closure (`closeRegister`) and reopening of closed registers.
      - Register history and closed register financial breakdowns (`/registers`, `/registers/:id`).
      - Advanced reports and net profit analytics (`/analytics`).
      - Catalog mutations: creating, editing, bulk price updates, or deleting products.
      - Inventory adjustments and manual stock overrides.
      - Provider ledger and supplier invoices (`/providers`).
      - Employee administration, salaries, and payroll settlements (`/employees`).
      - Authorizing credit beyond client fiado limit (`allow_over_limit`).
      - Editing or deleting past transactions from history.
      - Store settings, bank accounts, and disabling kiosk mode.


