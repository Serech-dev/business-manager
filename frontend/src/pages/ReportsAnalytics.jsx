import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

import { getAnalytics } from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import { useSubscriptionTier } from "../hooks/useSubscriptionTier";
import { exportToCsv } from "../utils/exportCsv";
import PremiumGate from "../components/subscription/PremiumGate";

function formatDateIso(dateObj) {
    return dateObj.toISOString().split("T")[0];
}

function ReportsAnalytics() {
    const [period, setPeriod] = useState("today"); // "today" | "week" | "month" | "custom"
    const [selectedDate, setSelectedDate] = useState(formatDateIso(new Date()));
    const [startDate, setStartDate] = useState(formatDateIso(new Date()));
    const [endDate, setEndDate] = useState(formatDateIso(new Date()));

    const { isPremium, hasFeature, openSubscriptionModal } = useSubscriptionTier();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredHour, setHoveredHour] = useState(null);

    function handleExportReport() {
        if (!isPremium && !hasFeature("export_excel")) {
            openSubscriptionModal();
            return;
        }

        if (!data || !data.summary) {
            toast.error("No hay datos cargados para exportar.");
            return;
        }

        try {
            const headers = ["Métrica", "Valor"];
            const rows = [
                ["Período", data.period_label || period],
                ["Ingresos Totales ($)", summary.total_income],
                ["Gastos / Proveedores ($)", summary.total_expenses],
                ["Balance Neto ($)", summary.net_balance],
                ["Cantidad de Operaciones", summary.total_transactions],
                ["Ticket Promedio ($)", summary.average_ticket],
                ["Hora Pico", summary.peak_hour ? `${summary.peak_hour}:00hs` : "N/A"],
                ["Ingreso en Hora Pico ($)", summary.peak_hour_income || 0],
            ];

            exportToCsv(`reporte_negocio_${period}.csv`, headers, rows);
            toast.success("Reporte exportado a Excel.");
        } catch (err) {
            toast.error(err.message || "Error al exportar reporte.");
        }
    }

    const loadData = useCallback(async () => {
        // If the selected period is gated and user is on Basic, the PremiumGate UI handles it directly
        if ((period === "month" || period === "custom") && !isPremium && !hasFeature("advanced_reports")) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const params = { period };
            if (period === "today") {
                params.start_date = selectedDate;
            } else if (period === "custom") {
                params.start_date = startDate;
                params.end_date = endDate;
            }

            const res = await getAnalytics(params);
            setData(res);
        } catch (error) {
            if (
                error?.response?.status === 403 ||
                error?.isFeatureRequiresPremium ||
                error?.isSubscriptionExpired
            ) {
                return;
            }
            console.error(error);
            toast.error("No se pudieron cargar los reportes.");
        } finally {
            setIsLoading(false);
        }
    }, [period, selectedDate, startDate, endDate, isPremium, hasFeature]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    function handlePreviousDay() {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() - 1);
        setSelectedDate(formatDateIso(d));
    }

    function handleNextDay() {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() + 1);
        setSelectedDate(formatDateIso(d));
    }

    const summary = data?.summary || {
        total_income: 0,
        total_expenses: 0,
        net_balance: 0,
        total_transactions: 0,
        average_ticket: 0,
        peak_hour: null,
        peak_hour_income: 0,
    };

    const dayparts = data?.dayparts || {};
    const hourly = data?.hourly || [];
    const methods = data?.methods || {};
    const operations = data?.operations || {};
    const dailyTimeline = data?.daily_timeline || [];

    const maxHourlyIncome = Math.max(...hourly.map((h) => h.income), 1);
    const totalMethodsVolume = Object.values(methods).reduce((a, b) => a + b, 0);

    const daypartColor = {
        morning: {
            border: "border-amber-500/30",
            bg: "bg-amber-500/10",
            text: "text-amber-500",
            bar: "bg-amber-500",
        },
        afternoon: {
            border: "border-orange-500/30",
            bg: "bg-orange-500/10",
            text: "text-orange-500",
            bar: "bg-orange-500",
        },
        night: {
            border: "border-indigo-500/30",
            bg: "bg-indigo-500/10",
            text: "text-indigo-400",
            bar: "bg-indigo-500",
        },
    };

    return (
        <div className="p-6 text-[var(--text-primary)] md:p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* HEADER & PERIOD CONTROLS */}
                <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Métricas & Estadísticas
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
                            Reportes del Negocio
                        </h1>
                    </div>

                    {/* PERIOD TABS & EXPORT BUTTON */}
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: "today", label: "Hoy / Por Día", isPro: false },
                            { id: "week", label: "Esta Semana", isPro: false },
                            { id: "month", label: "Este Mes", isPro: true },
                            { id: "custom", label: "Personalizado", isPro: true },
                        ].map((p) => {
                            const isSelected = period === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPeriod(p.id)}
                                    className={`
                                        inline-flex items-center gap-1.5
                                        rounded-md
                                        px-3.5
                                        py-2
                                        text-xs
                                        font-bold
                                        transition
                                        ${
                                            isSelected
                                                ? "bg-[var(--primary)] text-white shadow-xs"
                                                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                        }
                                    `}
                                >
                                    <span>{p.label}</span>
                                    {p.isPro && !isPremium && (
                                        <span className="badge-gold px-1.5 py-0.5 rounded-sm text-[9px]">
                                            PRO
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={handleExportReport}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                            title="Exportar métricas a formato Excel (CSV)"
                        >
                            <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            <span>Exportar Excel</span>
                            {!isPremium && (
                                <span className="badge-gold px-1.5 py-0.5 rounded-sm text-[9px]">
                                    PRO
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* DATE SELECTOR BAR */}
                {period === "today" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePreviousDay}
                                className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-muted)]"
                            >
                                ← Día anterior
                            </button>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                            <button
                                type="button"
                                onClick={handleNextDay}
                                className="rounded border border-[var(--border)] bg-[var(--surface-accent)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-muted)]"
                            >
                                Día siguiente →
                            </button>
                        </div>

                        <span className="text-xs font-semibold text-[var(--primary)]">
                            {data?.period_label}
                        </span>
                    </div>
                )}

                {period === "custom" && (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
                        <span className="font-semibold text-[var(--text-secondary)]">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={(e) => {
                                const val = e.target.value;
                                setStartDate(val);
                                if (endDate && val > endDate) {
                                    setEndDate(val);
                                }
                            }}
                            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <span className="font-semibold text-[var(--text-secondary)]">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEndDate(val);
                                if (startDate && val < startDate) {
                                    setStartDate(val);
                                }
                            }}
                            className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <span className="ml-auto font-semibold text-[var(--primary)]">
                            {data?.period_label}
                        </span>
                    </div>
                )}

                {/* ADVANCED PERIOD GATE FOR BASIC USERS */}
                {(period === "month" || period === "custom") && !isPremium && !hasFeature("advanced_reports") ? (
                    <PremiumGate
                        feature="advanced_reports"
                        title="Métricas Avanzadas & Filtro por Período"
                        description="Accedé a balances mensuales consolidados, rangos de fechas personalizados sin límite y análisis de horarios pico."
                        benefits={[
                            "Informes mensuales y anuales históricos",
                            "Filtro de fechas personalizado sin límite de días",
                            "Análisis horario y franjas de mayor afluencia comercial",
                            "Exportación de balances y métricas a Excel",
                        ]}
                    />
                ) : (
                    <>
                        {/* 4 TOP FINANCIAL KPIS */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* INGRESOS */}
                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Ingresos Totales
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--success)]">
                            {formatCurrency(summary.total_income)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Ventas, cargas y comisiones
                        </p>
                    </div>

                    {/* GASTOS */}
                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Gastos & Salidas
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--danger)]">
                            -{formatCurrency(summary.total_expenses)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Proveedores y gastos del local
                        </p>
                    </div>

                    {/* BALANCE NETO */}
                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Balance Neto
                        </p>
                        <p className={`mt-2 text-2xl font-bold tabular-nums ${summary.net_balance >= 0 ? "text-[var(--primary)]" : "text-[var(--danger)]"}`}>
                            {summary.net_balance >= 0 ? "+" : ""}
                            {formatCurrency(summary.net_balance)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Margen neto del período
                        </p>
                    </div>

                    {/* PROMEDIO POR VENTA & CANTIDAD */}
                    <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Promedio por Venta
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                            {formatCurrency(summary.average_ticket)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            En {summary.total_transactions} ventas registradas
                        </p>
                    </div>
                </div>

                {/* DAYPARTS / BLOQUES DEL DÍA */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">
                                Franjas Horarias del Día
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Distribución de ingresos y movimientos por momento del día
                            </p>
                        </div>

                        {summary.peak_hour && (
                            <div className="rounded-md border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                                Hora pico: {summary.peak_hour} ({formatCurrency(summary.peak_hour_income)})
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {["morning", "afternoon", "night"].map((key) => {
                            const dp = dayparts[key] || {};
                            const styling = daypartColor[key] || daypartColor.morning;
                            const share = summary.total_income > 0 ? Math.round((dp.income / summary.total_income) * 100) : 0;

                            return (
                                <div
                                    key={key}
                                    className={`rounded-lg border ${styling.border} bg-[var(--surface)] p-5 space-y-3`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${styling.bg} ${styling.text}`}>
                                                {dp.name}
                                            </span>
                                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                {dp.range}
                                            </p>
                                        </div>
                                        <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                                            {share}%
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xs text-[var(--text-secondary)]">Ingresos:</span>
                                            <span className="text-base font-bold text-[var(--success)]">
                                                {formatCurrency(dp.income || 0)}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-baseline justify-between text-xs text-[var(--text-secondary)]">
                                            <span>Operaciones:</span>
                                            <span className="font-semibold text-[var(--text-primary)]">
                                                {dp.count || 0} movimientos
                                            </span>
                                        </div>
                                    </div>

                                    {/* PROGRESS BAR */}
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                                        <div
                                            className={`h-full ${styling.bar} transition-all duration-500`}
                                            style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 24-HOUR VISUALIZER */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                Actividad Hora por Hora (24 Horas)
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Intensidad de ventas y movimientos a lo largo del día
                            </p>
                        </div>

                        {hoveredHour !== null && (
                            <div className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs">
                                <span className="font-bold text-[var(--text-primary)]">{hoveredHour.label}: </span>
                                <span className="font-bold text-[var(--success)]">{formatCurrency(hoveredHour.income)}</span>
                                <span className="text-[var(--text-secondary)]"> ({hoveredHour.count} ops)</span>
                            </div>
                        )}
                    </div>

                    {/* BARS CONTAINER */}
                    <div className="flex h-44 items-end gap-1.5 pt-6 sm:gap-2">
                        {hourly.map((h) => {
                            const isZero = h.income === 0;
                            const heightPercent = isZero ? 4 : Math.max(8, (h.income / maxHourlyIncome) * 100);
                            const styling = daypartColor[h.daypart] || daypartColor.morning;
                            const isPeak = summary.peak_hour === h.label && h.income > 0;

                            return (
                                <div
                                    key={h.hour}
                                    onMouseEnter={() => setHoveredHour(h)}
                                    onMouseLeave={() => setHoveredHour(null)}
                                    className="group relative flex flex-1 flex-col items-center h-full justify-end"
                                >
                                    {/* TOOLTIP ON HOVER */}
                                    <div className="pointer-events-none absolute -top-12 z-20 hidden flex-col items-center rounded-md bg-[var(--surface-accent)] px-2 py-1 text-[10px] shadow-lg group-hover:flex">
                                        <span className="font-bold">{h.label}</span>
                                        <span className="text-[var(--success)] font-bold">{formatCurrency(h.income)}</span>
                                    </div>

                                    {/* BAR */}
                                    <div
                                        className={`
                                            w-full
                                            rounded-t-xs
                                            transition-all
                                            duration-300
                                            ${
                                                isZero
                                                    ? "bg-[var(--surface-muted)]"
                                                    : isPeak
                                                        ? `${styling.bar} ring-2 ring-[var(--primary)]`
                                                        : styling.bar
                                            }
                                            group-hover:opacity-80
                                        `}
                                        style={{ height: `${heightPercent}%` }}
                                    />

                                    {/* HOUR LABEL */}
                                    <span className="mt-2 text-[9px] font-medium text-[var(--text-secondary)] sm:text-[10px]">
                                        {h.hour % 2 === 0 ? `${h.hour}h` : ""}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* LEGEND */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                            <span>Mañana (06:00 - 13:00)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-orange-500" />
                            <span>Tarde (13:00 - 18:00)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-indigo-500" />
                            <span>Noche (18:00 - 02:00)</span>
                        </div>
                    </div>
                </div>

                {/* DAILY TIMELINE (FOR MULTI-DAY PERIODS) */}
                {dailyTimeline.length > 1 && (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Evolución por Día del Período
                        </h3>

                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
                            {dailyTimeline.map((d) => (
                                <div
                                    key={d.date}
                                    className="rounded border border-[var(--border)] bg-[var(--surface-accent)]/50 p-3 space-y-1"
                                >
                                    <span className="text-xs font-bold text-[var(--text-secondary)]">{d.label}</span>
                                    <p className="text-sm font-bold text-[var(--success)]">{formatCurrency(d.income)}</p>
                                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                                        <span>-{formatCurrency(d.expenses)}</span>
                                        <span>{d.count} ops</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* BREAKDOWN SECTIONS: METHODS & OPERATIONS */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* MEDIOS DE PAGO */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Medios de Cobro
                        </h3>

                        <div className="space-y-3">
                            {[
                                { key: "cash", label: "Efectivo", color: "bg-[var(--success)]" },
                                { key: "transfer", label: "Transferencia", color: "bg-sky-500" },
                                { key: "card", label: "Tarjeta", color: "bg-purple-500" },
                                { key: "debt", label: "A cuenta otorgado", color: "bg-[var(--warning)]" },
                            ].map((m) => {
                                const val = methods[m.key] || 0;
                                const pct = totalMethodsVolume > 0 ? Math.round((val / totalMethodsVolume) * 100) : 0;

                                return (
                                    <div key={m.key} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-[var(--text-primary)]">{m.label}</span>
                                            <div className="space-x-2">
                                                <span className="font-bold text-[var(--text-primary)]">{formatCurrency(val)}</span>
                                                <span className="text-[var(--text-secondary)]">({pct}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                                            <div className={`h-full ${m.color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* OPERACIONES / RUBROS */}
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                            Rubros & Operaciones
                        </h3>

                        <div className="space-y-2.5">
                            {Object.entries(operations).map(([opKey, opData]) => {
                                if (opData.count === 0) return null;
                                const isExpense = ["provider", "expense", "loss"].includes(opKey);

                                return (
                                    <div
                                        key={opKey}
                                        className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
                                    >
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">{opData.label}</p>
                                            <span className="text-[10px] text-[var(--text-secondary)]">
                                                {opData.count} movimientos
                                            </span>
                                        </div>
                                        <span className={`font-bold tabular-nums ${isExpense ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                                            {isExpense ? "-" : ""}{formatCurrency(opData.total)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
</div>
    );
}

export default ReportsAnalytics;

