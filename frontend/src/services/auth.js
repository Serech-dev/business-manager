
export async function logout() {
    localStorage.removeItem("businessManagerAuthToken");
    localStorage.removeItem("businessManagerAuthUser");
}