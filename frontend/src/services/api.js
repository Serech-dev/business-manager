import axios from "axios";
import toast from "react-hot-toast";

const AUTH_TOKEN_KEY = "businessManagerAuthToken"; 
const AUTH_USER_KEY = "businessManagerAuthUser";

// Wrap toast.error to suppress redundant noise when subscription is expired or feature requires premium
const originalToastError = toast.error.bind(toast);
toast.error = (message, options) => {
    // If subscription is expired and caller didn't explicitly permit toasts (e.g. checkout errors)
    if (window.__BM_SUBSCRIPTION_EXPIRED__ && !options?.allowWhileExpired) {
        return null;
    }
    // If message is related to subscription expired or premium feature required, suppress generic popups
    if (
        typeof message === "string" &&
        (message.toLowerCase().includes("suscripción") ||
            message.toLowerCase().includes("expirad") ||
            message.toLowerCase().includes("plan premium") ||
            message.toLowerCase().includes("exclusiva del plan") ||
            message.toLowerCase().includes("requiere una suscripción"))
    ) {
        return null;
    }
    return originalToastError(message, options);
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("businessManagerAuthToken");

    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("businessManagerAuthToken");
            localStorage.removeItem("businessManagerAuthUser");

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        } else if (
            error.response?.status === 403 &&
            (error.response?.data?.code === "subscription_expired" ||
                error.response?.data?.code === "subscription_suspended")
        ) {
            window.__BM_SUBSCRIPTION_EXPIRED__ = true;
            // Dismiss any lingering error toasts
            toast.dismiss();
            window.dispatchEvent(
                new CustomEvent("bm_subscription_expired", {
                    detail: error.response.data,
                })
            );
            error.isSubscriptionExpired = true;
        } else if (
            error.response?.status === 403 &&
            error.response?.data?.code === "feature_requires_premium"
        ) {
            error.isFeatureRequiresPremium = true;
        }

        return Promise.reject(error);
    }
);

export function getApiError(
    error,
    fallback = "Ocurrió un error."
) {
    if (
        error?.response?.status === 403 &&
        (error?.response?.data?.code === "subscription_expired" ||
            error?.response?.data?.code === "subscription_suspended" ||
            error?.response?.data?.code === "feature_requires_premium" ||
            error?.isFeatureRequiresPremium)
    ) {
        return "";
    }

    const data = error.response?.data;

    if (!data) {
        return fallback;
    }

    if (typeof data === "string") {
        return data;
    }

    if (data.detail) {
        return data.detail;
    }

    const messages = Object.values(data).flat();

    if (messages.length > 0) {
        return messages.join(" ");
    }

    return fallback;
}

export default api;
