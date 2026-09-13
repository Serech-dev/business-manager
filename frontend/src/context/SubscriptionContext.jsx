import { createContext, useContext, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getSubscription, notifyPayment, getMyPayments } from "../services/auth";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [myPayments, setMyPayments] = useState([]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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
            setSubscription(subData.summary || subData);
            setMyPayments(paymentsData || []);
            return subData;
        } catch (error) {
            console.error("No se pudo cargar la suscripción:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                toast.error(msg);
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
                isSubscriptionModalOpen,
                openSubscriptionModal,
                closeSubscriptionModal,
                refreshSubscription,
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

