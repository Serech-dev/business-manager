import api from "./api";

export async function getActiveAnnouncement() {
    try {
        const response = await api.get("auth/announcements/active/");
        return response.data?.announcement || null;
    } catch (err) {
        // Non-blocking: if network fails or offline, return null
        return null;
    }
}

export async function getAdminAnnouncements() {
    const response = await api.get("auth/admin/announcements/");
    return response.data;
}

export async function createAdminAnnouncement(payload) {
    const response = await api.post("auth/admin/announcements/", payload);
    return response.data;
}

export async function updateAdminAnnouncement(id, payload) {
    const response = await api.patch(`auth/admin/announcements/${id}/`, payload);
    return response.data;
}

export async function deleteAdminAnnouncement(id) {
    const response = await api.delete(`auth/admin/announcements/${id}/`);
    return response.data;
}
