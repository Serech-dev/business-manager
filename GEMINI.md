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


