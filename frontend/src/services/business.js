import api from "./api";


export async function createTransaction(data) {
    const response = await api.post(
        "business/transactions/",
        data
    );

    return response.data;
}

export async function getTransactions(current = false) {
    const response = await api.get(
        `business/transactions/${current ? "?current=1" : ""}`
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

export async function getCurrentRegister() {
    const response = await api.get(
        "business/register/"
    );

    return response.data;
}

export async function openRegister() {
    const response = await api.post(
        "business/register/open/"
    );

    return response.data;
}

export async function closeRegister() {
    const response = await api.post(
        "business/register/close/"
    );

    return response.data;
}

export async function getClosedRegisters() {
    const response = await api.get(
        "business/registers/"
    );

    return response.data;
}


export async function getClosedRegister(id) {
    const response = await api.get(
        `business/registers/${id}/`
    );

    return response.data;
}

export async function updateTransactionAmountReceived(
    id,
    received
) {
    const response = await api.patch(
        `business/transaction-amounts/${id}/received/`,
        {
            received,
        }
    );

    return response.data;
}

export function getTransactionLabel(type) {
    const labels = {
        sale: "Venta",
        sube: "Carga SUBE",
        phone: "Carga de celular",
        exchange: "Cambio",
        sale_exchange: "Venta + Cambio",
        provider: "Proveedor",
        expense: "Gasto",
        loss: "Pérdida",
        payment: "Pagos de fiado",
    };

    return labels[type] || type;
}


export function getMethodLabel(method) {
    const labels = {
        cash: "Efectivo",
        transfer: "Transferencia",
        card: "Tarjeta",
        debt: "Fiado",
    };

    return labels[method] || method;
}


export async function getClient(id) {
    const response = await api.get(
        `business/clients/${id}/`
    );

    return response.data;
}


export async function updateClient(id, data) {
    const response = await api.patch(
        `business/clients/${id}/`,
        data
    );

    return response.data;
}


export async function createClient(data) {
    const response = await api.post(
        "business/clients/",
        data
    );

    return response.data;
}


export async function getClients(search = "") {
    const response = await api.get(
        "business/clients/",
        {
            params: search
                ? { search }
                : {},
        }
    );

    return response.data;
}


export async function getProviders() { 
    const response = await api.get( "business/providers/" ); 
    return response.data; 
}


export async function getProvider(id) {
    const response = await api.get(
        `business/providers/${id}/`
    );

    return response.data;
}


export async function updateProvider(id, data) {
    const response = await api.patch(
        `business/providers/${id}/`,
        data
    );

    return response.data;
}


export async function createProvider(data) {
    const response = await api.post(
        "business/providers/",
        data
    );

    return response.data;
}
