import { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
    getSubscription,
    notifyPayment,
    getMyPayments,
    createCheckoutPreference,
    verifyPaymentStatus,
} from "../services/auth";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [myPayments, setMyPayments] = useState([]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

    const token = localStorage.getItem("businessManagerAuthToken");

    const refreshSubscription = useCallback(async () => {
        const currentToken = localStorage.getItem("businessManagerAuthToken");
        if (!currentToken) {
            setSubscription(null);
            setIsLoading(false);
            return null;
        }

        try {
            const [subData, paymentsData] = await Promise.all([
                getSubscription(),
                getMyPayments().catch(() => []),
            ]);
            const sub = subData.summary || subData;
            setSubscription(sub);
            setMyPayments(paymentsData || []);
            const valid = Boolean(sub?.is_superuser || sub?.is_valid);
            window.__BM_SUBSCRIPTION_EXPIRED__ = !valid;
            return subData;
        } catch (error) {
            console.error("No se pudo cargar la suscripción:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle return from Mercado Pago / Mock checkout URL params
    useEffect(() => {
        if (!token) return;

        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get("payment_status") || params.get("status") || params.get("collection_status");
        const paymentId = params.get("payment_id") || params.get("collection_id");
        const plan = params.get("plan");
        const notificationId = params.get("notification_id");

        if (paymentStatus) {
            // Clean up URL parameters so back/refresh doesn't re-trigger
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            const verify = async () => {
                const toastId = toast.loading("Verificando estado de la suscripción...");
                try {
                    const result = await verifyPaymentStatus({
                        payment_status: paymentStatus,
                        payment_id: paymentId,
                        plan: plan,
                        notification_id: notificationId,
                    });

                    if (result.status === "approved" || paymentStatus === "approved" || paymentStatus === "success" || paymentStatus === "mock_simulate") {
                        window.__BM_SUBSCRIPTION_EXPIRED__ = false;
                        toast.success(result.detail || "¡Pago acreditado! Tu licencia fue activada con éxito.", { id: toastId });
                    } else if (paymentStatus === "pending") {
                        toast.loading("Tu pago está en proceso de acreditación.", { id: toastId });
                    } else if (paymentStatus === "failure" || paymentStatus === "rejected") {
                        toast.error("El pago no se pudo completar o fue cancelado.", { id: toastId, allowWhileExpired: true });
                    } else {
                        toast.dismiss(toastId);
                    }
                } catch (err) {
                    console.error("Error al verificar pago:", err);
                    if (paymentStatus === "approved" || paymentStatus === "success" || paymentStatus === "mock_simulate") {
                        window.__BM_SUBSCRIPTION_EXPIRED__ = false;
                        toast.success("¡Licencia activada!", { id: toastId });
                    } else {
                        toast.dismiss(toastId);
                    }
                } finally {
                    await refreshSubscription();
                }
            };

            verify();
        }
    }, [token, refreshSubscription]);

    useEffect(() => {
        if (token) {
            refreshSubscription();
        } else {
            setIsLoading(false);
        }
    }, [token, refreshSubscription]);

    // Handle 403 subscription_expired custom event from API interceptor
    useEffect(() => {
        function handleExpiredEvent(event) {
            window.__BM_SUBSCRIPTION_EXPIRED__ = true;
            if (event.detail?.subscription) {
                setSubscription(event.detail.subscription);
            } else {
                refreshSubscription();
            }
        }

        window.addEventListener("bm_subscription_expired", handleExpiredEvent);
        return () => window.removeEventListener("bm_subscription_expired", handleExpiredEvent);
    }, [refreshSubscription]);

    const openSubscriptionModal = useCallback(() => {
        setIsSubscriptionModalOpen(true);
    }, []);

    const closeSubscriptionModal = useCallback(() => {
        setIsSubscriptionModalOpen(false);
    }, []);

    const startCheckout = useCallback(
        async (plan = "yearly", { openInNewTab = false } = {}) => {
            setIsProcessingCheckout(true);
            try {
                const preference = await createCheckoutPreference({ plan });
                if (preference.init_point) {
                    if (openInNewTab) {
                        window.open(preference.init_point, "_blank", "noopener,noreferrer");
                    }
                    return preference;
                } else {
                    throw new Error("No se pudo obtener el link de pago.");
                }
            } catch (error) {
                console.error("Error al iniciar checkout:", error);
                const msg = error.response?.data?.error || error.response?.data?.detail || error.message || "Error al conectar con la pasarela de pago.";
                toast.error(msg, { allowWhileExpired: true });
                throw error;
            } finally {
                setIsProcessingCheckout(false);
            }
        },
        []
    );

    const submitPayment = useCallback(
        async (paymentData) => {
            setIsSubmittingPayment(true);
            try {
                const result = await notifyPayment(paymentData);
                toast.success("Aviso de pago enviado con éxito. El administrador lo revisará a la brevedad.");
                await refreshSubscription();
                return result;
            } catch (error) {
                console.error("Error al notificar pago:", error);
                const msg = error.response?.data?.detail || "No se pudo enviar el aviso de pago.";
                toast.error(msg, { allowWhileExpired: true });
                throw error;
            } finally {
                setIsSubmittingPayment(false);
            }
        },
        [refreshSubscription]
    );

    const isSuperuser = Boolean(subscription?.is_superuser);
    const isValid = isSuperuser || Boolean(subscription?.is_valid);
    const isExpired = Boolean(subscription && !isValid);
    const daysRemaining = subscription?.days_remaining ?? 0;
    const isExpiringSoon = Boolean(
        subscription && !isSuperuser && isValid && daysRemaining <= 3 && subscription.plan !== "lifetime"
    );
    const isTrial = Boolean(subscription?.is_trial);
    const hasPendingPayment = myPayments.some((p) => p.status === "pending");

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                isLoading,
                isExpired,
                isExpiringSoon,
                isValid,
                isTrial,
                daysRemaining,
                isSuperuser,
                myPayments,
                hasPendingPayment,
                isSubmittingPayment,
                isProcessingCheckout,
                isSubscriptionModalOpen,
                openSubscriptionModal,
                closeSubscriptionModal,
                refreshSubscription,
                startCheckout,
                submitPayment,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error("useSubscription must be used within a SubscriptionProvider");
    }
    return context;
}

