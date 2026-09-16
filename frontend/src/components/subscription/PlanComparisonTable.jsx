import React from "react";

const COMPARISON_GROUPS = [
    {
        title: "Punto de Venta & Operación Diaria",
        features: [
            {
                name: "Ventas y Cobro Ágil",
                description: "Cobro rápido con Efectivo, Débito, Crédito, Mercado Pago y Transferencia bancaria.",
                basic: true,
                premium: true,
            },
            {
                name: "Caja Diaria & Arqueos",
                description: "Apertura y cierre de turno, registro de egresos, cálculo de vuelto y control de efectivo.",
                basic: true,
                premium: true,
            },
            {
                name: "Catálogo de Productos & Precios",
                description: "Búsqueda por código de barras o nombre, rubros y actualización masiva o individual.",
                basic: true,
                premium: true,
            },
            {
                name: "Combos & Ofertas Especiales",
                description: "Packs promocionales con descuento y descuento automático de stock de los productos que lo componen.",
                basic: true,
                premium: true,
            },
            {
                name: "Cuentas Corrientes de Clientes (Fiados)",
                description: "Libreta digital de clientes, registro de saldos deudores y pagos a cuenta.",
                basic: true,
                premium: true,
            },
            {
                name: "Control de Stock & Alertas de Mínimos",
                description: "Monitoreo de existencias en tiempo real y aviso de productos por debajo del umbral mínimo.",
                basic: true,
                premium: true,
            },
        ],
    },
    {
        title: "Reportes, Métricas & Inteligencia de Negocio",
        features: [
            {
                name: "Métricas Básicas del Día",
                description: "Resumen diario de facturación, ticket promedio y cantidad de operaciones de la jornada.",
                basic: true,
                premium: true,
            },
            {
                name: "Reportes Analíticos Avanzados",
                description: "Ganancia neta real, margen por rubro/producto, horas pico de venta y curvas de facturación.",
                basic: false,
                premium: true,
            },
            {
                name: "Exportación a Excel & CSV",
                description: "Descarga de balances completos, historial de movimientos y catálogos en planillas de cálculo.",
                basic: false,
                premium: true,
            },
        ],
    },
    {
        title: "Gestión Multi-Usuario, Proveedores & Marca",
        features: [
            {
                name: "Módulo de Empleados & Roles",
                description: "Cuentas individuales para cajeros y supervisores con restricción de permisos y anulación de ventas.",
                basic: false,
                premium: true,
            },
            {
                name: "Libreta de Proveedores & Cuentas por Pagar",
                description: "Seguimiento de compras a crédito, fechas de vencimiento de facturas y órdenes pendientes.",
                basic: false,
                premium: true,
            },
            {
                name: "Personalización de Comprobantes",
                description: "Impresión de tickets térmicos con nombre del local, dirección, CUIT, teléfono y logotipo propio.",
                basic: false,
                premium: true,
            },
            {
                name: "Registro de Auditoría de Operaciones",
                description: "Trazabilidad detallada de modificaciones de precios, cancelaciones y ajustes manuales de stock.",
                basic: false,
                premium: true,
            },
        ],
    },
];

function CheckIcon() {
    return (
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
        </div>
    );
}

function LockDashIcon() {
    return (
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--surface-muted)] text-[var(--text-secondary)]/50 border border-[var(--border)]">
            <span className="text-xs font-bold leading-none select-none">—</span>
        </div>
    );
}

export function PlanComparisonTable({ onSelectPlan, currentTier }) {
    return (
        <div className="w-full space-y-6">
            {/* COMPARISON HEADER CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BASIC CARD */}
                <div className={`rounded-md border p-4 bg-[var(--surface)] transition ${currentTier === "basic" ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)]"}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Plan Esencial</span>
                            <h4 className="text-base font-bold text-[var(--text-primary)] mt-0.5">Plan Básico</h4>
                        </div>
                        {currentTier === "basic" && (
                            <span className="rounded-sm bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                Tu Plan Actual
                            </span>
                        )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[var(--text-primary)]">$9.900</span>
                        <span className="text-xs text-[var(--text-secondary)] font-medium">/ mes ($99.000/año)</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                        Ideal para comercios que necesitan agilidad total en caja, control de stock, combos y libreta de clientes.
                    </p>
                    {onSelectPlan && (
                        <button
                            type="button"
                            onClick={() => onSelectPlan("basic_monthly")}
                            className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--surface-accent)] py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                        >
                            Elegir Plan Básico
                        </button>
                    )}
                </div>

                {/* PREMIUM CARD */}
                <div className={`rounded-md border p-4 bg-[var(--surface)] relative overflow-hidden transition ${currentTier === "premium" || currentTier === "trial" ? "border-amber-500/50 ring-1 ring-amber-500/30" : "border-[var(--border)] hover:border-amber-500/30"}`}>
                    <div className="badge-gold absolute top-0 right-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-sm border-t-0 border-r-0">
                        Recomendado
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">Acceso Total</span>
                            <h4 className="text-base font-bold text-[var(--text-primary)] mt-0.5">Plan Premium</h4>
                        </div>
                        {(currentTier === "premium" || currentTier === "trial") && (
                            <span className="badge-gold px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider">
                                {currentTier === "trial" ? "Prueba (Acceso Total)" : "Tu Plan Actual"}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[var(--text-primary)]">$19.900</span>
                        <span className="text-xs text-[var(--text-secondary)] font-medium">/ mes ($199.000/año)</span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                        Para negocios en crecimiento que precisan múltiples empleados, reportes de rentabilidad y cuentas de proveedores.
                    </p>
                    {onSelectPlan && (
                        <button
                            type="button"
                            onClick={() => onSelectPlan("premium_monthly")}
                            className="mt-3 w-full rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] py-2 text-xs font-bold text-white shadow-xs uppercase tracking-wider transition"
                        >
                            Elegir Plan Premium
                        </button>
                    )}
                </div>
            </div>

            {/* DETAILED FEATURE TABLE */}
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-accent)]">
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] w-3/5">
                                Funcionalidad
                            </th>
                            <th className="py-3 px-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] w-1/5">
                                Básico
                            </th>
                            <th className="py-3 px-3 text-center text-xs font-bold uppercase tracking-wider text-amber-400 w-1/5">
                                Premium
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-xs">
                        {COMPARISON_GROUPS.map((group, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                <tr className="bg-[var(--surface-muted)]/60">
                                    <td colSpan={3} className="py-2.5 px-4 font-bold uppercase tracking-wider text-[11px] text-[var(--text-secondary)]">
                                        {group.title}
                                    </td>
                                </tr>
                                {group.features.map((feat, featIdx) => (
                                    <tr key={featIdx} className="hover:bg-[var(--surface-accent)]/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-[var(--text-primary)]">{feat.name}</p>
                                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                                                {feat.description}
                                            </p>
                                        </td>
                                        <td className="py-3 px-3 text-center align-middle">
                                            <div className="flex justify-center">
                                                {feat.basic ? <CheckIcon /> : <LockDashIcon />}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center align-middle bg-[var(--primary)]/[0.02]">
                                            <div className="flex justify-center">
                                                {feat.premium ? <CheckIcon /> : <LockDashIcon />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TIME CONSUMPTION NOTICE */}
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] p-3.5 flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 mt-0.5">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <p className="font-semibold text-[var(--text-primary)]">Acumulación Inteligente de Tiempo</p>
                    <p className="mt-0.5">
                        Si adquirís tiempo Premium teniendo días de Plan Básico activos, primero consumís tu período Premium. Al finalizar, continuás utilizando automáticamente tus días restantes del Plan Básico sin bloqueos ni pérdidas de saldo.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PlanComparisonTable;

