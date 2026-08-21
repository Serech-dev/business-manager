import api from "./api";


export async function createTransaction(data) {
    const response = await api.post(
        "business/transactions/",
        data
    );

    return response.data;
}


export async function getTransactions() {
    const response = await api.get(
        "business/transactions/"
    );

    return response.data;
}


export async function getTransaction(id) {
    const response = await api.get(
        `business/transactions/${id}/`
    );

    return response.data;
}


export async function updateTransaction(id, data) {
    const response = await api.patch(
        `business/transactions/${id}/`,
        data
    );

    return response.data;
}


export async function deleteTransaction(id) {
    await api.delete(
        `business/transactions/${id}/`
    );
}