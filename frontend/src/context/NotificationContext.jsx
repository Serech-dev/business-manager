import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getStockAlertsSummary, getCurrentRegister, getOverdueDebtsSummary } from "../services/business";
import { useSubscription } from "./SubscriptionContext";
import { formatCurrency } from "../utils/formatCurrency";

const NotificationContext = createContext(null);

const DISMISSED_STORAGE_KEY = "businessManagerDismissedNotifications";

export function NotificationProvider({ children }) {
    const {
        subscription,
        tier,
        isPremium,
        isTrial,
        isExpired,
        isSuspended,
        daysRemaining,
        openSubscriptionModal,
    } = useSubscription();

    const [stockSummary, setStockSummary] = useState(null);
    const [currentRegister, setCurrentRegister] = useState(null);
    const [debtSummary, setDebtSummary] = useState(null);
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [isOpen, setIsOpen] = useState(false);

    // Save dismissed alerts to localStorage
    const persistDismissed = (newDismissed) => {
        setDismissedIds(newDismissed);
        try {
            localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(newDismissed));
        } catch (e) {
            console.error("Error saving dismissed notifications:", e);
        }
    };

    // Load operational state
    const fetchAlertData = useCallback(async () => {
        const token = localStorage.getItem("businessManagerAuthToken");
        if (!token) return;

        try {
            const [stockRes, regRes, debtRes] = await Promise.allSettled([
                getStockAlertsSummary(),
                getCurrentRegister(),
                getOverdueDebtsSummary(),
            ]);

            if (stockRes.status === "fulfilled" && stockRes.value) {
                setStockSummary(stockRes.value);
            }
            if (regRes.status === "fulfilled") {
                setCurrentRegister(regRes.value);
            }
            if (debtRes.status === "fulfilled" && debtRes.value) {
                setDebtSummary(debtRes.value);
            }
        } catch (error) {
            console.warn("Notification polling error:", error);
        }
    }, []);

    // Initial fetch & polling every 60s
    useEffect(() => {
        fetchAlertData();
        const interval = setInterval(fetchAlertData, 60000);
        return () => clearInterval(interval);
    }, [fetchAlertData]);

    // Build active notifications list dynamically
    const rawNotifications = [];

    // 1. STOCK ALERTS
    if (stockSummary) {
        if (stockSummary.out_of_stock_count > 0) {
            rawNotifications.push({
                id: `stock_out_${stockSummary.out_of_stock_count}`,
                category: "stock",
                severity: "critical",
                title: "Productos sin stock",
                message: `Hay ${stockSummary.out_of_stock_count} ${
                    stockSummary.out_of_stock_count === 1 ? "artículo agotado" : "artículos agotados"
                } (0 unidades en inventario).`,
                actionLabel: "Ver en Stock",
                actionRoute: "/stock",
                count: stockSummary.out_of_stock_count,
            });
        }

        if (stockSummary.low_stock_count > 0) {
            rawNotifications.push({
                id: `stock_low_${stockSummary.low_stock_count}`,
                category: "stock",
                severity: "warning",
                title: "Stock por debajo del mínimo",
                message: `Hay ${stockSummary.low_stock_count} ${
                    stockSummary.low_stock_count === 1 ? "artículo" : "artículos"
                } que alcanzaron o superaron el umbral mínimo de reposición.`,
                actionLabel: "Ver en Stock",
                actionRoute: "/stock",
                count: stockSummary.low_stock_count,
            });
        }

        if (stockSummary.pending_notes_count > 0) {
            rawNotifications.push({
                id: `stock_notes_${stockSummary.pending_notes_count}`,
                category: "stock",
                severity: "info",
                title: "Notas de reposición pendientes",
                message: `Tenés ${stockSummary.pending_notes_count} ${
                    stockSummary.pending_notes_count === 1 ? "nota de mercadería pendiente" : "notas de mercadería pendientes"
                } de recibir.`,
                actionLabel: "Ver Notas",
                actionRoute: "/stock",
                count: stockSummary.pending_notes_count,
            });
        }
    }

    // 2. SUBSCRIPTION & LICENSE ALERTS
    if (subscription) {
        if (isSuspended) {
            rawNotifications.push({
                id: "license_suspended",
                category: "license",
                severity: "critical",
                title: "Cuenta suspendida",
                message: "La suscripción se encuentra suspendida. Contactá con soporte o reactivá el servicio.",
                actionLabel: "Ver Estado",
                actionType: "modal",
            });
        } else if (isExpired) {
            rawNotifications.push({
                id: "license_expired",
                category: "license",
                severity: "critical",
                title: "Licencia vencida",
                message: "Tu plan ha expirado. Renová tu licencia para acceder a todas las funciones sin restricciones.",
                actionLabel: "Renovar Plan",
                actionType: "modal",
            });
        } else if (isTrial && typeof daysRemaining === "number" && daysRemaining <= 5) {
            rawNotifications.push({
                id: `license_trial_${daysRemaining}`,
                category: "license",
                severity: "warning",
                title: "Prueba Premium por finalizar",
                message: `Quedan ${daysRemaining} ${
                    daysRemaining === 1 ? "día" : "días"
                } de prueba gratuita. Adquirí un plan para continuar con tu negocio sin interrupciones.`,
                actionLabel: "Elegir Plan",
                actionType: "modal",
            });
        } else if (!isTrial && typeof daysRemaining === "number" && daysRemaining <= 5 && daysRemaining > 0) {
            rawNotifications.push({
                id: `license_expiring_${daysRemaining}`,
                category: "license",
                severity: "warning",
                title: "Licencia por vencer",
                message: `Quedan ${daysRemaining} ${
                    daysRemaining === 1 ? "día" : "días"
                } de tu plan activo. Renová con anticipación para mantener la continuidad del sistema.`,
                actionLabel: "Renovar Plan",
                actionType: "modal",
            });
        }
    }

    // 3. OVERNIGHT CASH REGISTER (CAJA SIN CERRAR)
    if (currentRegister && currentRegister.opened_at) {
        try {
            const openedDate = new Date(currentRegister.opened_at);
            const now = new Date();
            const isDifferentDay =
                openedDate.getFullYear() !== now.getFullYear() ||
                openedDate.getMonth() !== now.getMonth() ||
                openedDate.getDate() !== now.getDate();

            if (isDifferentDay) {
                const formattedDate = openedDate.toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                });
                rawNotifications.push({
                    id: `register_overnight_${currentRegister.id}_${formattedDate}`,
                    category: "register",
                    severity: "warning",
                    title: "Caja de jornada anterior sin cerrar",
                    message: `La caja actual fue abierta el ${formattedDate}. Recordá realizar el arqueo y cierre diario antes de iniciar el nuevo turno.`,
                    actionLabel: "Ir a Caja",
                    actionRoute: "/registers",
                });
            }
        } catch (e) {
            console.error("Date parse error in register notification:", e);
        }
    }

    // 4. UNCONFIRMED TRANSFERS (Transferencias sin acreditar hace 1 hora o más en la caja actual)
    if (currentRegister && Array.isArray(currentRegister.pending_transfers)) {
        currentRegister.pending_transfers.forEach((transfer) => {
            if (!transfer.created_at) return;
            const createdAt = new Date(transfer.created_at);
            if (isNaN(createdAt.getTime())) return;

            const elapsedMinutes = Math.floor((Date.now() - createdAt.getTime()) / (60 * 1000));
            // Trigger after 1 hour (60 minutes)
            if (elapsedMinutes >= 60) {
                const hours = Math.floor(elapsedMinutes / 60);
                const timeText = hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
                const clientText = transfer.client_name ? `de ${transfer.client_name}` : `Operación #${transfer.transaction_id}`;
                const amountFormatted = formatCurrency(transfer.amount);

                rawNotifications.push({
                    id: `transfer_unconfirmed_${transfer.amount_id}`,
                    category: "transfer",
                    severity: elapsedMinutes >= 120 ? "critical" : "warning",
                    title: "Transferencia sin acreditar",
                    message: `Transferencia de ${amountFormatted} (${clientText}) lleva ${timeText} sin confirmarse.`,
                    actionLabel: "Ver venta",
                    actionRoute: `/?highlight=${transfer.transaction_id}`,
                    transferId: transfer.amount_id,
                    transactionId: transfer.transaction_id,
                });
            }
        });
    }

    // 5. OVERDUE CUSTOMER DEBTS (Clientes con fiado pendiente hace 7 días o más sin pagos)
    if (debtSummary && debtSummary.count > 0 && Array.isArray(debtSummary.clients)) {
        if (debtSummary.count <= 3) {
            debtSummary.clients.forEach((c) => {
                const daysText = c.days_overdue === 1 ? "1 día" : `${c.days_overdue} días`;
                rawNotifications.push({
                    id: `debt_overdue_${c.id}`,
                    category: "debt",
                    severity: c.days_overdue >= 30 ? "critical" : "warning",
                    title: `Fiado pendiente: ${c.name}`,
                    message: `Adeuda ${formatCurrency(c.debt)} hace ${daysText} sin registrar pagos.`,
                    actionLabel: "Ver cuenta",
                    actionRoute: `/clients/${c.id}`,
                });
            });
        } else {
            // Consolidated summary alert
            rawNotifications.push({
                id: `debt_overdue_summary_${debtSummary.count}`,
                category: "debt",
                severity: "warning",
                title: "Fiados pendientes de cobro",
                message: `Hay ${debtSummary.count} clientes con saldo deudor hace más de 7 días sin registrar pagos (Total: ${formatCurrency(debtSummary.total_overdue_debt)}).`,
                actionLabel: "Ver clientes",
                actionRoute: "/clients?filter=debt",
            });

            // Plus top 2 individual overdue clients
            debtSummary.clients.slice(0, 2).forEach((c) => {
                const daysText = c.days_overdue === 1 ? "1 día" : `${c.days_overdue} días`;
                rawNotifications.push({
                    id: `debt_overdue_${c.id}`,
                    category: "debt",
                    severity: c.days_overdue >= 30 ? "critical" : "warning",
                    title: `Fiado pendiente: ${c.name}`,
                    message: `Adeuda ${formatCurrency(c.debt)} hace ${daysText} sin registrar pagos.`,
                    actionLabel: "Ver cuenta",
                    actionRoute: `/clients/${c.id}`,
                });
            });
        }
    }

    // Filter out dismissed notifications
    const activeNotifications = rawNotifications.map((notif) => ({
        ...notif,
        isRead: Boolean(dismissedIds[notif.id]),
    }));

    const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

    const dismissNotification = useCallback(
        (id) => {
            const updated = { ...dismissedIds, [id]: Date.now() };
            persistDismissed(updated);
        },
        [dismissedIds]
    );

    const markAllAsRead = useCallback(() => {
        const updated = { ...dismissedIds };
        activeNotifications.forEach((n) => {
            updated[n.id] = Date.now();
        });
        persistDismissed(updated);
    }, [dismissedIds, activeNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications: activeNotifications,
                unreadCount,
                isOpen,
                setIsOpen,
                dismissNotification,
                markAllAsRead,
                refreshNotifications: fetchAlertData,
                openSubscriptionModal,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}

