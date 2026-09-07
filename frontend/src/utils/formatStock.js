/**
 * Formats a unit_type code into a friendly Spanish label.
 * @param {string} unitType - 'unit' | 'kg' | '100g'
 * @param {boolean} [long=false] - Whether to return full word ('unidad' vs 'u.')
 * @param {number} [count=1] - Number for pluralization ('unidad' vs 'unidades')
 */
export function formatUnitType(unitType, long = false, count = 1) {
    if (!unitType) return long ? "unidad" : "u.";
    const u = String(unitType).toLowerCase();
    if (u === "unit" || u === "unidad") {
        if (long) {
            return count === 1 ? "unidad" : "unidades";
        }
        return "u.";
    }
    if (u === "kg" || u === "kilo" || u === "kilogramo") {
        return long ? (count === 1 ? "kilo" : "kilos") : "kg";
    }
    if (u === "100g") {
        return "100g";
    }
    return unitType;
}

/**
 * Formats stock quantity: strips decimals for unitary items, retains clean decimals for weighted items.
 * @param {number|string} qty
 * @param {string} [unitType='unit']
 */
export function formatStockQty(qty, unitType = "unit") {
    if (qty === null || qty === undefined || qty === "") return "0";
    const num = Number(qty);
    if (isNaN(num)) return String(qty);
    if (unitType === "unit") {
        return String(Math.round(num));
    }
    return parseFloat(num.toFixed(2)).toString();
}
