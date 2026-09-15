/**
 * barcodeLookup.js
 * 
 * Queries open product databases (Open Food Facts & Open Products Facts)
 * to automatically retrieve the product name, brand, and details from an EAN-13 / UPC barcode.
 */

const barcodeCache = new Map();

/**
 * Lookup product details by barcode
 * @param {string} barcode 
 * @returns {Promise<{ name: string, brand: string, category: string, raw: object } | null>}
 */
export async function lookupBarcodeDetails(barcode) {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();
    if (cleanBarcode.length < 5) return null;

    if (barcodeCache.has(cleanBarcode)) {
        return barcodeCache.get(cleanBarcode);
    }

    try {
        // Try Open Food Facts first (covers foods, drinks, sweets, snacks)
        let result = await fetchFromOpenDatabase(
            `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json?fields=product_name,product_name_es,brands,generic_name,generic_name_es,quantity,categories`
        );

        // If not found in food, try Open Products Facts (covers hygiene, paper, tobacco, household goods)
        if (!result) {
            result = await fetchFromOpenDatabase(
                `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}.json?fields=product_name,product_name_es,brands,generic_name,generic_name_es,quantity,categories`
            );
        }

        if (result) {
            barcodeCache.set(cleanBarcode, result);
            return result;
        }
    } catch (err) {
        console.warn("Barcode lookup network or timeout issue:", err);
    }

    return null;
}

async function fetchFromOpenDatabase(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status === 1 && data.product) {
            const p = data.product;
            const rawName = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || "";
            const brand = (p.brands || "").split(",")[0].trim();
            const quantity = (p.quantity || "").trim();

            if (!rawName && !brand) return null;

            // Assemble clean name
            let constructedName = rawName;
            if (brand && !constructedName.toLowerCase().includes(brand.toLowerCase())) {
                constructedName = `${brand} ${constructedName}`.trim();
            }
            if (quantity && !constructedName.toLowerCase().includes(quantity.toLowerCase())) {
                constructedName = `${constructedName} ${quantity}`.trim();
            }

            return {
                name: constructedName || rawName || brand,
                brand: brand || "",
                category: p.categories || "",
                barcode: data.code || "",
                raw: p,
            };
        }
    } catch (error) {
        // Ignored or aborted
        return null;
    } finally {
        clearTimeout(timeout);
    }

    return null;
}

