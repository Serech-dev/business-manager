/**
 * barcodeLookup.js
 * 
 * High-speed multi-source barcode resolver:
 * 1. Checks in-memory and persistent localStorage cache.
 * 2. Queries Open Food Facts, Open Products Facts, and Open Beauty Facts APIs.
 * 3. Formats clean title (Brand + Product + Quantity) and auto-maps to our 11 Argentine categories.
 */

const LOCAL_STORAGE_CACHE_KEY = "bm_scanned_barcode_cache";

// Initialize in-memory cache from localStorage
const barcodeCache = new Map();
try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        for (const [k, v] of Object.entries(parsed)) {
            barcodeCache.set(k, v);
        }
    }
} catch {
    // Ignore storage parse issues
}

function saveToStorage() {
    try {
        const obj = Object.fromEntries(barcodeCache.entries());
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {
        // Storage limit or disabled
    }
}

/**
 * Maps raw OpenFood/Beauty categories into the 11 Argentine generalist categories
 */
function inferArgentineCategory(categoryStr = "", nameStr = "") {
    const text = `${categoryStr} ${nameStr}`.toLowerCase();

    if (/gaseosa|bebida|agua|jugo|cerveza|vino|licor|soda|aperitivo|energizante|isotonica|cola|sprite|fanta|quilmes|brahma/i.test(text)) {
        return "Bebidas";
    }
    if (/alfajor|chocolate|chicle|caramelo|galletita|snack|papas|chizito|confite|turron|bon o bon|rocklets|bombón/i.test(text)) {
        return "Golosinas & Snacks";
    }
    if (/yerba|azúcar|azucar|café|cafe|fideo|arroz|harina|aceite|conserva|salsa|puré|pure|tomate|legumbre|lenteja|sal|condimento|vinagre|mayonesa|ketchup|mostaza/i.test(text)) {
        return "Almacén";
    }
    if (/leche|queso|yogur|manteca|crema|fiambre|jamón|jamon|salame|mortadela|tapa de empanada|dulce de leche/i.test(text)) {
        return "Fiambrería & Lácteos";
    }
    if (/pan|medialuna|factura|prepiz|torta|bizcocho|galleta/i.test(text)) {
        return "Panadería";
    }
    if (/carne|pollo|cerdo|hamburguesa|paty|milanesa|huevo/i.test(text)) {
        return "Carnicería & Granja";
    }
    if (/fruta|verdura|papa|tomate|cebolla|banana|manzana|naranja|lechuga/i.test(text)) {
        return "Verdulería & Frutería";
    }
    if (/lavandina|detergente|desinfectante|limpiador|jabón para ropa|suavizante|rollo de cocina|papel higiénico|servilleta|bolsa de residuo/i.test(text)) {
        return "Limpieza";
    }
    if (/shampoo|acondicionador|desodorante|jabón de tocador|dentífrico|crema dental|cepillo dental|afeitadora|toallitas|pañal|panal|perfumería|higiene|pañuelo/i.test(text)) {
        return "Perfumería & Higiene";
    }
    if (/cigarrillo|tabaco|encendedor|papelillo|filtro/i.test(text)) {
        return "Cigarrillos & Tabaquería";
    }
    if (/perro|gato|mascota|alimento para mascotas|cat chow|dog chow|whiskas|pedigree|piedras sanitarias/i.test(text)) {
        return "Mascotas";
    }

    return "Almacén";
}

/**
 * Lookup product details by barcode across public verified databases
 * @param {string} barcode 
 * @returns {Promise<{ name: string, brand: string, category: string, barcode: string } | null>}
 */
export async function lookupBarcodeDetails(barcode) {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();
    if (cleanBarcode.length < 5) return null;

    if (barcodeCache.has(cleanBarcode)) {
        return barcodeCache.get(cleanBarcode);
    }

    const apis = [
        `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json?fields=product_name,product_name_es,brands,generic_name,generic_name_es,quantity,categories`,
        `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}.json?fields=product_name,product_name_es,brands,generic_name,generic_name_es,quantity,categories`,
        `https://world.openbeautyfacts.org/api/v2/product/${cleanBarcode}.json?fields=product_name,product_name_es,brands,generic_name,generic_name_es,quantity,categories`,
    ];

    for (const url of apis) {
        try {
            const result = await fetchFromOpenDatabase(url);
            if (result) {
                barcodeCache.set(cleanBarcode, result);
                saveToStorage();
                return result;
            }
        } catch {
            // Try next provider
        }
    }

    return null;
}

async function fetchFromOpenDatabase(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);

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
            const rawName = (p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || "").trim();
            const brand = (p.brands || "").split(",")[0].trim();
            const quantity = (p.quantity || "").trim();

            if (!rawName && !brand) return null;

            // Assemble clean, readable name
            let constructedName = rawName;
            if (brand && !constructedName.toLowerCase().includes(brand.toLowerCase())) {
                constructedName = `${brand} ${constructedName}`.trim();
            }
            if (quantity && !constructedName.toLowerCase().includes(quantity.toLowerCase())) {
                constructedName = `${constructedName} ${quantity}`.trim();
            }

            const cleanName = (constructedName || rawName || brand)
                .split(" ")
                .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
                .join(" ");

            const category = inferArgentineCategory(p.categories, cleanName);

            return {
                name: cleanName,
                brand: brand || "",
                category: category,
                barcode: data.code || "",
            };
        }
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }

    return null;
}

export default lookupBarcodeDetails;
