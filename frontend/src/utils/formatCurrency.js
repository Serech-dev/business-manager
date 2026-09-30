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

/**
 * Formats a promotional threshold and price nicely for display across the UI.
 * Handles both unit quantities (e.g. "3x $5.000") and weighed items (e.g. "1 kg x $8.500" or "500g x $4.500").
 *
 * @param {object} product
 * @returns {string}
 */
export function formatPromoLabel(product) {
    if (!product || !product.promo_quantity || !product.promo_price) return "";
    const isWeight = product.unit_type === "kg" || product.unit_type === "100g";
    if (isWeight) {
        const grams = Number(product.promo_quantity);
        const weightLabel = grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000} kg` : `${grams}g`;
        return `${weightLabel} x ${formatCurrency(product.promo_price)}`;
    }
    return `${product.promo_quantity}x ${formatCurrency(product.promo_price)}`;
}