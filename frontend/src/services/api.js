import axios from "axios";

const AUTH_TOKEN_KEY = "businessManagerAuthToken"; 
const AUTH_USER_KEY = "businessManagerAuthUser";

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
        }

        return Promise.reject(error);
    }
);

export function getApiError(
    error,
    fallback = "Ocurrió un error."
) {
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