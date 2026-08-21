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