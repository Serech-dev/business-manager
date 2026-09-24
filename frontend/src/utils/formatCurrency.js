export function formatCurrency(value) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Rounds a monetary amount or calculated subtotal up to the nearest 50.
 * In Argentine cash/retail transactions, values are rounded up to multiples of $50
 * to match circulating currency and avoid fractional/small coin issues.
 *
 * @param {number|string} value
 * @returns {number}
 */
export function roundUpTo50(value) {
    const num = Number(value) || 0;
    if (num <= 0) return 0;
    return Math.ceil(num / 50) * 50;
}