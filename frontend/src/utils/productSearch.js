/**
 * Normalizes text for search by removing accents/diacritics and trimming whitespace.
 * e.g., "Panadería" -> "panaderia", "Taragüi" -> "taragui", "Capitán" -> "capitan"
 */
export function normalizeSearchText(text) {
    if (!text) return "";
    return String(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Calculates a relevance score for a product given a search query.
 * Higher score = higher relevance. Returns 0 if product doesn't match query.
 */
export function scoreProductSearch(product, rawQuery) {
    const q = normalizeSearchText(rawQuery);
    if (!q) return 1;

    const name = normalizeSearchText(product.name);
    const barcode = normalizeSearchText(product.barcode);
    const category = normalizeSearchText(product.category_name);
    const provider = normalizeSearchText(product.provider_name);

    // Exact name match -> highest possible priority
    if (name === q) {
        return 10000;
    }

    // Exact barcode match
    if (barcode && barcode === q) {
        return 9000;
    }

    const queryTokens = q.split(/\s+/).filter(Boolean);
    const nameTokens = name.split(/\s+/).filter(Boolean);

    // 1. Check if name starts with the exact full query
    let baseScore = 0;
    if (name.startsWith(q)) {
        baseScore += 5000;
    }

    // 2. Check if any word in the name starts with the exact full query (e.g. "Flauta Pan" when searching "pan")
    const anyWordStartsWithFullQuery = nameTokens.some((tok) => tok.startsWith(q));
    if (anyWordStartsWithFullQuery) {
        baseScore += 3000;
    }

    // 3. Token-by-token matching (all tokens must match somewhere)
    let allTokensMatch = true;
    let tokenScore = 0;

    for (const token of queryTokens) {
        let tokenMatched = false;
        let bestNameTokenMatch = 0;

        for (const nTok of nameTokens) {
            if (nTok === token) {
                bestNameTokenMatch = Math.max(bestNameTokenMatch, 1000); // Exact word match
            } else if (nTok.startsWith(token)) {
                bestNameTokenMatch = Math.max(bestNameTokenMatch, 600); // Word prefix match
            } else if (nTok.includes(token)) {
                bestNameTokenMatch = Math.max(bestNameTokenMatch, 150); // Word infix match (e.g. campagnola for pan)
            }
        }

        if (bestNameTokenMatch > 0) {
            tokenMatched = true;
            tokenScore += bestNameTokenMatch;
        } else if (barcode && barcode.includes(token)) {
            tokenMatched = true;
            tokenScore += barcode.startsWith(token) ? 500 : 200;
        } else if (category && category.includes(token)) {
            tokenMatched = true;
            tokenScore += 80;
        } else if (provider && provider.includes(token)) {
            tokenMatched = true;
            tokenScore += 50;
        }

        if (!tokenMatched) {
            allTokensMatch = false;
            break;
        }
    }

    if (!allTokensMatch) {
        return 0;
    }

    let finalScore = baseScore + tokenScore;

    // Bonus for shorter names (closer exact intent)
    finalScore += Math.max(0, 100 - name.length);

    return finalScore;
}

/**
 * Filter and sort products based on search query and optional filters.
 */
export function filterAndRankProducts(products = [], query = "", options = {}) {
    const {
        categoryId = null,
        providerId = null,
        statusFilter = "all", // 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock' | 'in_stock' | 'untracked'
        maxResults = null,
        customFilter = null,
    } = options;

    const trimmedQuery = query ? query.trim() : "";
    const matching = [];

    for (const p of products) {
        if (categoryId && categoryId !== "all" && String(p.category) !== String(categoryId)) {
            continue;
        }
        if (providerId && providerId !== "all" && String(p.provider) !== String(providerId)) {
            continue;
        }
        if (statusFilter === "active" && !p.is_active) {
            continue;
        }
        if (statusFilter === "inactive" && p.is_active) {
            continue;
        }
        if (statusFilter === "out_of_stock") {
            if (p.stock === null || Number(p.stock) > 0) continue;
        } else if (statusFilter === "low_stock") {
            if (p.stock === null || Number(p.stock) <= 0 || Number(p.stock) > Number(p.min_stock || 1)) continue;
        } else if (statusFilter === "in_stock") {
            if (p.stock === null || Number(p.stock) <= Number(p.min_stock || 1)) continue;
        } else if (statusFilter === "untracked") {
            if (p.stock !== null) continue;
        }

        if (customFilter && !customFilter(p)) {
            continue;
        }

        if (trimmedQuery) {
            const score = scoreProductSearch(p, trimmedQuery);
            if (score > 0) {
                matching.push({ product: p, score });
            }
        } else {
            matching.push({ product: p, score: 0 });
        }
    }

    if (trimmedQuery) {
        // Sort by relevance score DESC, then name length ASC, then alphabetical
        matching.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            if (a.product.name.length !== b.product.name.length) {
                return a.product.name.length - b.product.name.length;
            }
            return a.product.name.localeCompare(b.product.name);
        });
    }

    const result = matching.map((m) => m.product);

    if (maxResults && maxResults > 0) {
        return result.slice(0, maxResults);
    }

    return result;
}
