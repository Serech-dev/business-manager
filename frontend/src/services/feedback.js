import api from "./api";

export async function submitFeedback(payload) {
    const response = await api.post("auth/feedback/", payload);
    return response.data;
}

export async function getAdminFeedback(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.feedback_type) query.append("feedback_type", params.feedback_type);
    if (params.search) query.append("search", params.search);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await api.get(`auth/admin/feedback/${queryString}`);
    return response.data;
}

export async function updateAdminFeedback(id, payload) {
    const response = await api.patch(`auth/admin/feedback/${id}/`, payload);
    return response.data;
}

export async function deleteAdminFeedback(id) {
    const response = await api.delete(`auth/admin/feedback/${id}/`);
    return response.data;
}
