import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getEmployeeSummary,
    getEmployeeMovements,
    getEmployeeAttendance,
    getRegisterShifts,
    getEmployees,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import EmployeeModal from "../components/employees/EmployeeModal";
import EmployeeMovementModal from "../components/employees/EmployeeMovementModal";
import EmployeeAttendanceModal from "../components/employees/EmployeeAttendanceModal";
import EmployeeSettlementModal from "../components/employees/EmployeeSettlementModal";
import PremiumGate from "../components/subscription/PremiumGate";
import { useSubscriptionTier } from "../hooks/useSubscriptionTier";

const SALARY_TYPE_LABELS = {
    monthly: "Mensual",
    daily: "Por día / Jornal",
    hourly: "Por hora",
    fixed: "Fijo / Por turno",
};

const MOVEMENT_TYPE_CONFIG = {
    consumption: {
        label: "Consumo en tienda",
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        sign: "-",
    },
    advance: {
        label: "Adelanto de sueldo",
        badge: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        sign: "-",
    },
    bonus: {
        label: "Bono / Premio",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        sign: "+",
    },
    deduction: {
        label: "Descuento / Sanción",
        badge: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]",
        sign: "-",
    },
    salary_payment: {
        label: "Liquidación / Pago",
        badge: "border-primary/40 bg-primary/10 text-primary font-bold",
        sign: "",
    },
};

const ATTENDANCE_STATUS_CONFIG = {
    present: {
        label: "Presente / Día Trabajado",
        badge: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
    },
    absent: {
        label: "Falta Injustificada",
        badge: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]",
    },
    justified: {
        label: "Falta Justificada (con aviso)",
        badge: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    late: {
        label: "Llegada Tarde",
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    day_off: {
        label: "Franco / Descanso",
        badge: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    },
};

function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isPremium, hasFeature } = useSubscriptionTier();

    const [employee, setEmployee] = useState(null);
    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [activeTab, setActiveTab] = useState("movements"); // 'movements' | 'shifts' | 'attendance'
    const [isLoading, setIsLoading] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [movementModalConfig, setMovementModalConfig] = useState({ isOpen: false, type: "advance" });
    const [attendanceModalConfig, setAttendanceModalConfig] = useState({ isOpen: false, status: "absent" });

    const loadData = useCallback(async () => {
        if (!isPremium && !hasFeature("employees")) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [summaryData, movsData, attData, shiftsData] = await Promise.all([
                getEmployeeSummary(id),
                getEmployeeMovements(id),
                getEmployeeAttendance(id),
                getRegisterShifts({ employee_id: id }),
            ]);

            setSummary(summaryData);
            setEmployee(summaryData.employee);
            setMovements(movsData || []);
            setAttendances(attData || []);
            const shiftsList = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.results || []);
            setShifts(shiftsList);
        } catch (error) {
            if (error?.response?.status === 403 || error?.isFeatureRequiresPremium) {
                return;
            }
            console.error("Error al cargar ficha de empleado:", error);
            toast.error("No se pudo cargar la información del empleado.");
        } finally {
            setIsLoading(false);
        }
    }, [id, isPremium, hasFeature]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                Cargando ficha del empleado...
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-12 text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">Empleado no encontrado</p>
                <button
                    type="button"
                    onClick={() => navigate("/employees")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                    Volver a la lista
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
            <PremiumGate
                feature="employees"
                title="Ficha del Empleado & Historial de Pagos"
                description="Visualizá el detalle de asistencia, liquidaciones de sueldo, adelantos y consumos internos del personal."
                benefits={[
                    "Fichas de empleados con roles y sueldos configurables",
                    "Control de asistencia con reloj de fichadas, llegadas tarde y faltas",
                    "Liquidación automática de sueldos con descuento de consumos internos y adelantos",
                    "Control de turnos de caja independientes con arqueos y cambio de cajero",
                ]}
            >
                {/* Top Navigation & Header */}
            <div>
                <button
                    type="button"
                    onClick={() => navigate("/employees")}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    <span>Volver a Empleados</span>
                </button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-accent)] text-xl font-black text-[var(--primary)]">
                            {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                                    {employee.name}
                                </h1>
                                <span
                                    className={`rounded-sm px-2 py-0.5 text-[10px] font-bold border ${
                                        employee.is_active
                                            ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
                                            : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                    }`}
                                >
                                    {employee.is_active ? "Activo" : "Inactivo"}
                                </span>
                                {Number(employee.discount_percentage) > 0 && (
                                    <span className="rounded-sm bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] border border-[var(--primary)]/20">
                                        {Number(employee.discount_percentage)}% Descuento compras
                                    </span>
                                )}
                            </div>

                            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                {employee.role || "Personal general"} &bull; {SALARY_TYPE_LABELS[employee.salary_type] || employee.salary_type} ({formatCurrency(Number(employee.base_salary))})
                                {employee.phone && <span> &bull; Tel: {employee.phone}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition"
                        >
                            <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                            <span>Editar Perfil</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Payroll & Balance Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Sueldo Base
                    </span>
                    <p className="mt-1 text-base font-black tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(Number(summary?.base_earnings) || 0)}
                    </p>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        {employee.salary_type === "daily" ? `${summary?.days_present || 0} días trabajados` : "Base acordada"}
                    </span>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Bonos / Premios
                    </span>
                    <p className="mt-1 text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Number(summary?.bonuses_total) || 0)}
                    </p>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        Adicionales
                    </span>
                </div>

                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Consumo en Local
                    </span>
                    <p className="mt-1 text-base font-black tabular-nums text-amber-700 dark:text-amber-300">
                        -{formatCurrency(Number(summary?.consumptions_total) || 0)}
                    </p>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                        A descontar
                    </span>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Adelantos Entregados
                    </span>
                    <p className="mt-1 text-base font-black tabular-nums text-sky-600 dark:text-sky-400">
                        -{formatCurrency(Number(summary?.advances_total) || 0)}
                    </p>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        A cuenta de sueldo
                    </span>
                </div>

                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Otros Descuentos
                    </span>
                    <p className="mt-1 text-base font-black tabular-nums text-[var(--danger)]">
                        -{formatCurrency(Number(summary?.deductions_total) || 0)}
                    </p>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                        Faltantes / Ajustes
                    </span>
                </div>

                <div className="rounded-md border-2 border-[var(--primary)] bg-[var(--primary)]/5 p-3 shadow-xs flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                            Total a Pagar
                        </span>
                        <p className="mt-1 text-lg font-black tabular-nums text-[var(--primary)]">
                            {formatCurrency(Number(summary?.net_payable) || 0)}
                        </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--primary)]/20 pt-2">
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                            Saldo a liquidar
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsSettlementModalOpen(true)}
                            className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90 transition shadow-xs"
                        >
                            Liquidar Sueldo
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance & Shift Summary Row */}
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-xs text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mr-2">
                    Resumen Laboral:
                </span>

                <div className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-accent)]/50 px-2.5 py-1">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Turnos de Caja:</span>
                    <span className="font-black tabular-nums text-[var(--text-primary)]">{shifts.length}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1 text-[var(--danger)]">
                    <span className="text-[11px] font-semibold">Faltas Injustificadas:</span>
                    <span className="font-black tabular-nums">{summary?.attendances_summary?.absent_count || 0}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-sm border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-400">
                    <span className="text-[11px] font-semibold">Faltas Justificadas:</span>
                    <span className="font-black tabular-nums">{summary?.attendances_summary?.justified_count || 0}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
                    <span className="text-[11px] font-semibold">Llegadas Tarde:</span>
                    <span className="font-black tabular-nums">{summary?.attendances_summary?.late_count || 0}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-accent)]/30 px-2.5 py-1">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Días Presente:</span>
                    <span className="font-black tabular-nums text-[var(--text-primary)]">{summary?.attendances_summary?.present_count || 0}</span>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
                <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--primary)] bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v1.5m0-1.5h19.5m0 0v1.5m0-1.5h-.75a.75.75 0 0 1-.75-.75V4.5m-15 0a2.25 2.25 0 0 1 2.25-2.25h10.5a2.25 2.25 0 0 1 2.25 2.25m-15 0v14.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V4.5" />
                    </svg>
                    <span>Liquidar Sueldo</span>
                </button>

                <div className="hidden sm:block h-4 w-px bg-[var(--border)] mx-0.5" />

                <button
                    type="button"
                    onClick={() => setMovementModalConfig({ isOpen: true, type: "advance" })}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Dar Adelanto</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMovementModalConfig({ isOpen: true, type: "consumption" })}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span>Anotar Consumo</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMovementModalConfig({ isOpen: true, type: "bonus" })}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Bono / Premio</span>
                </button>

                <div className="hidden sm:block h-4 w-px bg-[var(--border)] mx-1" />

                <button
                    type="button"
                    onClick={() => setAttendanceModalConfig({ isOpen: true, status: "absent" })}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    <span>Anotar Falta</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAttendanceModalConfig({ isOpen: true, status: "late" })}
                    className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:opacity-90 transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Llegada Tarde</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAttendanceModalConfig({ isOpen: true, status: "present" })}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                >
                    <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>Registrar Jornada</span>
                </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-[var(--border)]">
                <button
                    type="button"
                    onClick={() => setActiveTab("movements")}
                    className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "movements"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    Adelantos & Consumos ({movements.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("shifts")}
                    className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "shifts"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    Turnos de Caja ({shifts.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("attendance")}
                    className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                        activeTab === "attendance"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    Faltas & Asistencias ({attendances.length})
                </button>
            </div>

            {/* TAB 1: MOVEMENTS */}
            {activeTab === "movements" && (
                <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                    {movements.length === 0 ? (
                        <div className="py-12 px-4 text-center">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                No hay movimientos de cuenta registrados para este empleado.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Tipo de Operación</th>
                                        <th className="px-4 py-3">Detalle / Concepto</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {movements.map((mov) => {
                                        const config = MOVEMENT_TYPE_CONFIG[mov.type] || {
                                            label: mov.type_display || mov.type,
                                            badge: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                                            sign: "",
                                        };
                                        return (
                                            <tr key={mov.id} className="transition hover:bg-[var(--surface-accent)]/30">
                                                <td className="px-4 py-3 text-[var(--text-secondary)] font-medium tabular-nums whitespace-nowrap">
                                                    {new Date(mov.date).toLocaleDateString("es-AR", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold border ${config.badge}`}>
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                                                    {mov.notes || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums">
                                                    <span className={mov.type === "bonus" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-primary)]"}>
                                                        {config.sign}{formatCurrency(Number(mov.amount))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold border ${
                                                            mov.is_settled
                                                                ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                                                : "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                                        }`}
                                                    >
                                                        {mov.is_settled ? "Liquidado" : "Pendiente"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: REGISTER SHIFTS */}
            {activeTab === "shifts" && (
                <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                    {shifts.length === 0 ? (
                        <div className="py-12 px-4 text-center">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                No hay turnos de caja registrados para este empleado aún.
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]/80">
                                Cada vez que este empleado esté a cargo de una caja o realice un relevo de turno, se registrarán automáticamente sus ventas, cobros y arqueos.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3">Apertura</th>
                                        <th className="px-4 py-3">Cierre</th>
                                        <th className="px-4 py-3 text-center">Operaciones</th>
                                        <th className="px-4 py-3 text-right">Ventas Totales</th>
                                        <th className="px-4 py-3 text-right">Efectivo Cobrado</th>
                                        <th className="px-4 py-3 text-right">Diferencia</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {shifts.map((shift) => {
                                        const openDate = new Date(shift.opened_at);
                                        const openFormatted = `${openDate.toLocaleDateString("es-AR")} ${openDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

                                        let closeFormatted = "En curso";
                                        if (shift.closed_at) {
                                            const closeDate = new Date(shift.closed_at);
                                            closeFormatted = `${closeDate.toLocaleDateString("es-AR")} ${closeDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
                                        }

                                        const diff = Number(shift.difference) || 0;

                                        return (
                                            <tr key={shift.id} className="transition hover:bg-[var(--surface-accent)]/30">
                                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                                                    {openFormatted}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums whitespace-nowrap text-[var(--text-secondary)]">
                                                    {closeFormatted}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold tabular-nums text-[var(--text-primary)]">
                                                    {shift.transaction_count}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--text-primary)]">
                                                    {formatCurrency(Number(shift.total_sales) || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--text-secondary)]">
                                                    {formatCurrency(Number(shift.cash_sales) || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold tabular-nums">
                                                    {!shift.closed_at ? (
                                                        <span className="text-[var(--text-secondary)]">-</span>
                                                    ) : diff === 0 ? (
                                                        <span className="text-[var(--text-secondary)]">Exacto ($0)</span>
                                                    ) : diff > 0 ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(diff)} (Sobrante)</span>
                                                    ) : (
                                                        <span className="text-[var(--danger)]">{formatCurrency(diff)} (Faltante)</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold border ${
                                                            shift.is_open
                                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                                        }`}
                                                    >
                                                        {shift.is_open ? "Abierto" : "Cerrado"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: ATTENDANCE & ABSENCES */}
            {activeTab === "attendance" && (
                <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                    {attendances.length === 0 ? (
                        <div className="py-12 px-4 text-center space-y-3">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                No hay registros de faltas o asistencias cargados aún.
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAttendanceModalConfig({ isOpen: true, status: "absent" })}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                    <span>Anotar Falta</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAttendanceModalConfig({ isOpen: true, status: "late" })}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:opacity-90 transition shadow-xs"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    <span>Llegada Tarde</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Estado de Asistencia</th>
                                        <th className="px-4 py-3 text-center">Horas Registradas</th>
                                        <th className="px-4 py-3">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {attendances.map((att) => {
                                        const config = ATTENDANCE_STATUS_CONFIG[att.status] || {
                                            label: att.status_display || att.status,
                                            badge: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                                        };
                                        return (
                                            <tr key={att.id} className="transition hover:bg-[var(--surface-accent)]/30">
                                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                                                    {att.date}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold border ${config.badge}`}>
                                                        {config.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold tabular-nums text-[var(--text-primary)]">
                                                    {att.hours_worked !== null ? `${att.hours_worked} hs` : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                    {att.notes || "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <EmployeeModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                employee={employee}
                onSuccess={() => loadData()}
            />

            <EmployeeMovementModal
                isOpen={movementModalConfig.isOpen}
                onClose={() => setMovementModalConfig({ isOpen: false, type: "advance" })}
                employeeId={employee.id}
                employeeName={employee.name}
                defaultType={movementModalConfig.type}
                onSuccess={() => loadData()}
            />

            <EmployeeAttendanceModal
                isOpen={attendanceModalConfig.isOpen}
                onClose={() => setAttendanceModalConfig({ isOpen: false, status: "absent" })}
                employeeId={employee.id}
                employeeName={employee.name}
                defaultStatus={attendanceModalConfig.status}
                onSuccess={() => loadData()}
            />

            <EmployeeSettlementModal
                isOpen={isSettlementModalOpen}
                onClose={() => setIsSettlementModalOpen(false)}
                employee={employee}
                summary={summary}
                onSuccess={() => loadData()}
            />
            </PremiumGate>
        </div>
    );
}

export default EmployeeDetail;
