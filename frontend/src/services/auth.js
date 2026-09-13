import api from "./api";

export async function logout() {
    const token = localStorage.getItem("businessManagerAuthToken");
    localStorage.removeItem("businessManagerAuthToken");
    localStorage.removeItem("businessManagerAuthUser");

    if (token) {
        try {
            await api.post("auth/logout/", {}, {
                headers: { Authorization: `Token ${token}` },
            });
        } catch {
            // Server already expired or unreachable
        }
    }
}

export async function getSubscription() {
    const response = await api.get("auth/subscription/");
    return response.data;
}

export async function createCheckoutPreference(payload) {
    const response = await api.post("auth/subscription/create-checkout/", payload);
    return response.data;
}

export async function verifyPaymentStatus(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`auth/subscription/verify-payment/?${query}`);
    return response.data;
}

export async function notifyPayment(payload) {
    const response = await api.post("auth/subscription/notify-payment/", payload);
    return response.data;
}

export async function getMyPayments() {
    const response = await api.get("auth/subscription/my-payments/");
    return response.data;
}

// Superuser / Owner Panel API
export async function getAdminStores(search = "", status = "") {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);

    const response = await api.get(`auth/admin/stores/?${params.toString()}`);
    return response.data;
}

export async function manageAdminSubscription(userId, payload) {
    const response = await api.post(`auth/admin/subscriptions/${userId}/action/`, payload);
    return response.data;
}

export async function getAdminPayments(status = "") {
    const params = new URLSearchParams();
    if (status) params.append("status", status);

    const response = await api.get(`auth/admin/payments/?${params.toString()}`);
    return response.data;
}

export async function reviewAdminPayment(paymentId, payload) {
    const response = await api.post(`auth/admin/payments/${paymentId}/review/`, payload);
    return response.data;
}