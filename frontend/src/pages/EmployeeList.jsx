import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getEmployees,
    getRegisterShifts,
    getEmployeeAttendance,
} from "../services/business";
import { formatCurrency } from "../utils/formatCurrency";
import { useShift } from "../context/ShiftContext";
import EmployeeModal from "../components/employees/EmployeeModal";
import EmployeeMovementModal from "../components/employees/EmployeeMovementModal";
import EmployeeAttendanceModal from "../components/employees/EmployeeAttendanceModal";

const SALARY_TYPE_LABELS = {
    monthly: "Mensual",
    daily: "Por día / Jornal",
    hourly: "Por hora",
    fixed: "Fijo / Por turno",
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

function EmployeeList() {
    const navigate = useNavigate();
    const { activeShift, openHandoverModal } = useShift();

    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("employees"); // 'employees' | 'shifts' | 'attendance'
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("active"); // 'all' | 'active' | 'inactive'
    const [attendanceFilter, setAttendanceFilter] = useState("all"); // 'all' | 'absent' | 'late' | 'justified'

    // Modals
    const [isCreateOrEditOpen, setIsCreateOrEditOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const [movementModalConfig, setMovementModalConfig] = useState({
        isOpen: false,
        employeeId: null,
        employeeName: "",
        type: "advance",
    });

    const [attendanceModalConfig, setAttendanceModalConfig] = useState({
        isOpen: false,
        employeeId: null,
        employeeName: "",
        status: "absent",
    });

    const loadData = useCallback(async () => {
        try {
            const [empData, shiftsData, attData] = await Promise.all([
                getEmployees(false),
                getRegisterShifts(),
                getEmployeeAttendance(),
            ]);
            setEmployees(empData || []);
            const shiftsList = Array.isArray(shiftsData) ? shiftsData : (shiftsData?.results || []);
            setShifts(shiftsList);
            const attList = Array.isArray(attData) ? attData : (attData?.results || []);
            setAttendances(attList);
        } catch (error) {
            console.error("Error al cargar datos del módulo de empleados:", error);
            toast.error("No se pudieron cargar los datos de personal.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    function handleOpenCreate() {
        setSelectedEmployee(null);
        setIsCreateOrEditOpen(true);
    }

    function handleOpenEdit(emp) {
        setSelectedEmployee(emp);
        setIsCreateOrEditOpen(true);
    }

    function handleOpenFalta(emp = null) {
        setAttendanceModalConfig({
            isOpen: true,
            employeeId: emp ? emp.id : null,
            employeeName: emp ? emp.name : "",
            status: "absent",
        });
    }

    function handleOpenAdelanto(emp = null) {
        setMovementModalConfig({
            isOpen: true,
            employeeId: emp ? emp.id : null,
            employeeName: emp ? emp.name : "",
            type: "advance",
        });
    }

    function handleOpenConsumo(emp = null) {
        setMovementModalConfig({
            isOpen: true,
            employeeId: emp ? emp.id : null,
            employeeName: emp ? emp.name : "",
            type: "consumption",
        });
    }

    // Filtered lists
    const filteredEmployees = employees.filter((emp) => {
        if (statusFilter === "active" && !emp.is_active) return false;
        if (statusFilter === "inactive" && emp.is_active) return false;
        if (!search.trim()) return true;

        const q = search.toLowerCase();
        return (
            emp.name.toLowerCase().includes(q) ||
            (emp.role && emp.role.toLowerCase().includes(q)) ||
            (emp.phone && emp.phone.includes(search))
        );
    });

    const filteredAttendances = attendances.filter((att) => {
        if (attendanceFilter === "absent" && att.status !== "absent") return false;
        if (attendanceFilter === "late" && att.status !== "late") return false;
        if (attendanceFilter === "justified" && att.status !== "justified") return false;
        if (!search.trim()) return true;

        const q = search.toLowerCase();
        return (
            (att.employee_name && att.employee_name.toLowerCase().includes(q)) ||
            (att.notes && att.notes.toLowerCase().includes(q)) ||
            att.date.includes(search)
        );
    });

    const filteredShifts = shifts.filter((shift) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (shift.employee_name && shift.employee_name.toLowerCase().includes(q)) ||
            (shift.notes && shift.notes.toLowerCase().includes(q))
        );
    });

    // Metrics calculations
    const activeCount = employees.filter((e) => e.is_active).length;
    const totalPayrollBase = employees
        .filter((e) => e.is_active)
        .reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);

    const totalPendingDeductions = employees.reduce(
        (sum, e) =>
            sum +
            (Number(e.unsettled_advance_total) || 0) +
            (Number(e.unsettled_consumption_total) || 0),
        0
    );

    const totalAbsencesThisMonth = employees.reduce(
        (sum, e) => sum + (Number(e.absent_count_this_month) || 0),
        0
    );

    const totalLatesThisMonth = employees.reduce(
        (sum, e) => sum + (Number(e.late_count_this_month) || 0),
        0
    );

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                Cargando personal y turnos...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                        Equipo & Personal
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        Gestión de Personal & Turnos
                    </h1>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Control directo de inasistencias, turnos de caja, adelantos, consumos y liquidación de sueldos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Quick absence button */}
                    <button
                        type="button"
                        onClick={() => handleOpenFalta()}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2 text-xs font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        <span>Anotar Falta</span>
                    </button>

                    {/* Quick advance button */}
                    <button
                        type="button"
                        onClick={() => handleOpenAdelanto()}
                        className="flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:opacity-90 transition shadow-xs"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>Dar Adelanto</span>
                    </button>

                    {/* Shift Handover */}
                    <button
                        type="button"
                        onClick={openHandoverModal}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition shadow-xs"
                    >
                        <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                        <span>Cambio de Turno</span>
                    </button>

                    {/* New Employee */}
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Nuevo Empleado</span>
                    </button>
                </div>
            </header>

            {/* Quick Metrics Cards (4 Columns) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Active Shift */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Turno Actual en Caja
                    </span>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-base font-bold text-[var(--primary)] truncate">
                            {activeShift?.employee_name || "General (Sin asignar)"}
                        </span>
                        <span className="rounded-sm bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)] border border-[var(--success-border)]">
                            {activeShift ? "En Turno" : "Caja Libre"}
                        </span>
                    </div>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                        {activeShift ? "A cargo de la caja registradora" : "Sin cajero asignado actualmente"}
                    </span>
                </div>

                {/* 2. Missed days / Absences */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Inasistencias este Mes
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className={`text-2xl font-black tabular-nums ${totalAbsencesThisMonth > 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                            {totalAbsencesThisMonth} {totalAbsencesThisMonth === 1 ? "falta" : "faltas"}
                        </span>
                        {totalAbsencesThisMonth > 0 ? (
                            <span className="rounded-sm bg-[var(--danger-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)] border border-[var(--danger-border)]">
                                Inasistencias
                            </span>
                        ) : (
                            <span className="rounded-sm bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] border border-[var(--border)]">
                                Al día
                            </span>
                        )}
                    </div>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                        {totalLatesThisMonth} llegadas tarde registradas
                    </span>
                </div>

                {/* 3. Pending Ledger / Store debts */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Adelantos y Consumos
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">
                            {formatCurrency(totalPendingDeductions)}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                            A descontar
                        </span>
                    </div>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                        Anticipos y consumos del personal
                    </span>
                </div>

                {/* 4. Active Personnel */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Personal Activo
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-[var(--text-primary)]">
                            {activeCount} de {employees.length}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                            En nómina
                        </span>
                    </div>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                        Base acordada: {formatCurrency(totalPayrollBase)}
                    </span>
                </div>
            </div>

            {/* Top Level Module Tabs */}
            <div className="flex border-b border-[var(--border)]">
                <button
                    type="button"
                    onClick={() => setActiveTab("employees")}
                    className={`border-b-2 px-5 py-3 text-xs font-bold transition ${
                        activeTab === "employees"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    Personal ({employees.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("shifts")}
                    className={`border-b-2 px-5 py-3 text-xs font-bold transition ${
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
                    className={`border-b-2 px-5 py-3 text-xs font-bold transition ${
                        activeTab === "attendance"
                            ? "border-[var(--primary)] text-[var(--primary)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                >
                    Faltas & Novedades ({attendances.length})
                </button>
            </div>

            {/* TAB 1: EMPLOYEES & LEDGER */}
            {activeTab === "employees" && (
                <div className="space-y-4">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, puesto o teléfono..."
                                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setStatusFilter("active")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    statusFilter === "active"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Activos ({activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("all")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    statusFilter === "all"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Todos ({employees.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("inactive")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    statusFilter === "inactive"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Inactivos ({employees.length - activeCount})
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                        {filteredEmployees.length === 0 ? (
                            <div className="py-12 px-4 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[var(--surface-accent)] border border-[var(--border)] text-[var(--text-secondary)] mb-3">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    No se encontraron empleados
                                </h3>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                                    {employees.length === 0
                                        ? "Registrá al personal del negocio para habilitar turnos de caja, registrar consumos internos y llevar su liquidación."
                                        : "No hay empleados que coincidan con los filtros de búsqueda aplicados."}
                                </p>
                                {employees.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={handleOpenCreate}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition"
                                    >
                                        Registrar Primer Empleado
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3">Empleado & Rol</th>
                                            <th className="px-4 py-3 text-center">Turnos (Mes)</th>
                                            <th className="px-4 py-3 text-center">Faltas (Mes)</th>
                                            <th className="px-4 py-3">Adelantos y Consumos</th>
                                            <th className="px-4 py-3">Sueldo Base</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-right">Acciones Rápidas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {filteredEmployees.map((emp) => {
                                            const adv = Number(emp.unsettled_advance_total) || 0;
                                            const cons = Number(emp.unsettled_consumption_total) || 0;
                                            const totalDebts = adv + cons;
                                            const absences = Number(emp.absent_count_this_month) || 0;
                                            const lates = Number(emp.late_count_this_month) || 0;
                                            const shiftsMonth = Number(emp.shifts_count_this_month) || 0;

                                            return (
                                                <tr
                                                    key={emp.id}
                                                    className="transition hover:bg-[var(--surface-accent)]/30"
                                                >
                                                    {/* Empleado */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-accent)] font-bold text-[var(--primary)]">
                                                                {emp.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/employees/${emp.id}`)}
                                                                    className="font-bold text-[var(--text-primary)] hover:text-[var(--primary)] transition text-left"
                                                                >
                                                                    {emp.name}
                                                                </button>
                                                                <p className="text-[11px] text-[var(--text-secondary)]">
                                                                    {emp.role || "Personal general"}
                                                                    {emp.phone && <span> &bull; {emp.phone}</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Turnos mes */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--surface-accent)]/50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--text-primary)]">
                                                            <svg className="h-3 w-3 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                            </svg>
                                                            <span>{shiftsMonth}</span>
                                                        </span>
                                                    </td>

                                                    {/* Faltas mes */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {absences > 0 ? (
                                                                <span className="inline-block rounded-sm border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2 py-0.5 text-[10px] font-black text-[var(--danger)]">
                                                                    {absences} {absences === 1 ? "falta" : "faltas"}
                                                                </span>
                                                            ) : lates === 0 ? (
                                                                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                                                    Al día
                                                                </span>
                                                            ) : null}

                                                            {lates > 0 && (
                                                                <span className="inline-block rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                                    {lates} {lates === 1 ? "tarde" : "tardes"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Adelantos y Consumos */}
                                                    <td className="px-4 py-3.5">
                                                        {totalDebts > 0 ? (
                                                            <div className="space-y-0.5">
                                                                <span className="block font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                                                    -{formatCurrency(totalDebts)}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                                                    {adv > 0 && <span>Adel: -{formatCurrency(adv)}</span>}
                                                                    {adv > 0 && cons > 0 && <span>&bull;</span>}
                                                                    {cons > 0 && <span>Cons: -{formatCurrency(cons)}</span>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                                                $0 (Al día)
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Sueldo base */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="block font-bold tabular-nums text-[var(--text-primary)]">
                                                            {formatCurrency(Number(emp.base_salary) || 0)}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-secondary)]">
                                                            {SALARY_TYPE_LABELS[emp.salary_type] || emp.salary_type}
                                                        </span>
                                                    </td>

                                                    {/* Estado */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        <span
                                                            className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold border ${
                                                                emp.is_active
                                                                    ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
                                                                    : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                                            }`}
                                                        >
                                                            {emp.is_active ? "Activo" : "Inactivo"}
                                                        </span>
                                                    </td>

                                                    {/* Acciones Rápidas */}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Direct Falta Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenFalta(emp)}
                                                                className="flex items-center gap-1 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2 py-1 text-[11px] font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs"
                                                                title="Anotar falta o inasistencia para este empleado"
                                                            >
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                </svg>
                                                                <span>Falta</span>
                                                            </button>

                                                            {/* Direct Adelanto Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenAdelanto(emp)}
                                                                className="flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:opacity-90 transition shadow-xs"
                                                                title="Registrar adelanto de sueldo a cuenta"
                                                            >
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                                </svg>
                                                                <span>Adelanto</span>
                                                            </button>

                                                            {/* Direct Consumo Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenConsumo(emp)}
                                                                className="hidden sm:flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:opacity-90 transition shadow-xs"
                                                                title="Anotar consumo en local del empleado"
                                                            >
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                                                </svg>
                                                                <span>Consumo</span>
                                                            </button>

                                                            {/* Ficha & Turnos */}
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/employees/${emp.id}`)}
                                                                className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition shadow-xs"
                                                                title="Ver ficha completa, cuenta corriente y turnos de caja"
                                                            >
                                                                <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v10.5m0-10.5h16.5m-16.5 0a48.667 48.667 0 0 1 16.5 0m0 0v10.5m0 0c0 .754-.726 1.294-1.453 1.096a60.1 60.1 0 0 0-15.047 0" />
                                                                </svg>
                                                                <span>Ficha</span>
                                                            </button>

                                                            {/* Edit Profile */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(emp)}
                                                                className="rounded-md border border-[var(--border)] p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition shadow-xs"
                                                                title="Editar datos de empleado"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: REGISTER SHIFTS (ALL BUSINESS) */}
            {activeTab === "shifts" && (
                <div className="space-y-4">
                    {/* Search & Shift Handover */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por cajero u observaciones..."
                                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={openHandoverModal}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition shadow-xs self-start sm:self-auto"
                        >
                            <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            <span>Realizar Cambio de Turno</span>
                        </button>
                    </div>

                    {/* Shifts Table */}
                    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                        {filteredShifts.length === 0 ? (
                            <div className="py-12 px-4 text-center">
                                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                    No hay turnos de caja registrados aún en el sistema.
                                </p>
                                <p className="mt-1 text-[11px] text-[var(--text-secondary)]/80">
                                    Al abrir la caja registradora o realizar un relevo de personal, se registrarán automáticamente todas las aperturas y cierres aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3">Cajero / Empleado</th>
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
                                        {filteredShifts.map((shift) => {
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
                                                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                                                        {shift.employee ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/employees/${shift.employee}`)}
                                                                className="hover:text-[var(--primary)] transition text-left"
                                                            >
                                                                {shift.employee_name}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[var(--text-secondary)]">
                                                                {shift.employee_name}
                                                            </span>
                                                        )}
                                                    </td>
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
                </div>
            )}

            {/* TAB 3: ATTENDANCE & ABSENCES (ALL BUSINESS) */}
            {activeTab === "attendance" && (
                <div className="space-y-4">
                    {/* Search & Actions Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por empleado, fecha o motivo..."
                                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setAttendanceFilter("all")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    attendanceFilter === "all"
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Todas ({attendances.length})
                            </button>

                            <button
                                type="button"
                                onClick={() => setAttendanceFilter("absent")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    attendanceFilter === "absent"
                                        ? "bg-[var(--danger)] text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Faltas ({attendances.filter((a) => a.status === "absent").length})
                            </button>

                            <button
                                type="button"
                                onClick={() => setAttendanceFilter("late")}
                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                    attendanceFilter === "late"
                                        ? "bg-amber-600 text-white shadow-xs"
                                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                Llegadas Tarde ({attendances.filter((a) => a.status === "late").length})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleOpenFalta()}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs ml-1"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                                <span>Anotar Falta o Novedad</span>
                            </button>
                        </div>
                    </div>

                    {/* Attendances Table */}
                    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                        {filteredAttendances.length === 0 ? (
                            <div className="py-12 px-4 text-center space-y-3">
                                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                    No hay registros de inasistencias o asistencia con los filtros aplicados.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleOpenFalta()}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:opacity-90 transition shadow-xs"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                    <span>Anotar Falta o Novedad</span>
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Empleado</th>
                                            <th className="px-4 py-3">Novedad / Estado</th>
                                            <th className="px-4 py-3 text-center">Horas</th>
                                            <th className="px-4 py-3">Observaciones / Motivo</th>
                                            <th className="px-4 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {filteredAttendances.map((att) => {
                                            const config = ATTENDANCE_STATUS_CONFIG[att.status] || {
                                                label: att.status_display || att.status,
                                                badge: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                                            };
                                            return (
                                                <tr key={att.id} className="transition hover:bg-[var(--surface-accent)]/30">
                                                    <td className="px-4 py-3 font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                                                        {att.date}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/employees/${att.employee}`)}
                                                            className="hover:text-[var(--primary)] transition text-left"
                                                        >
                                                            {att.employee_name}
                                                        </button>
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
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/employees/${att.employee}`)}
                                                            className="rounded-md border border-[var(--border)] bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition shadow-xs"
                                                        >
                                                            Ver Ficha
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <EmployeeModal
                isOpen={isCreateOrEditOpen}
                onClose={() => setIsCreateOrEditOpen(false)}
                employee={selectedEmployee}
                onSuccess={() => loadData()}
            />

            <EmployeeMovementModal
                isOpen={movementModalConfig.isOpen}
                onClose={() => setMovementModalConfig({ isOpen: false, employeeId: null, employeeName: "", type: "advance" })}
                employeeId={movementModalConfig.employeeId}
                employeeName={movementModalConfig.employeeName}
                employees={employees}
                defaultType={movementModalConfig.type}
                onSuccess={() => loadData()}
            />

            <EmployeeAttendanceModal
                isOpen={attendanceModalConfig.isOpen}
                onClose={() => setAttendanceModalConfig({ isOpen: false, employeeId: null, employeeName: "", status: "absent" })}
                employeeId={attendanceModalConfig.employeeId}
                employeeName={attendanceModalConfig.employeeName}
                employees={employees}
                defaultStatus={attendanceModalConfig.status}
                onSuccess={() => loadData()}
            />
        </div>
    );
}

export default EmployeeList;
