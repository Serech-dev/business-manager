/**
 * Exports data array to a CSV file formatted for Excel (with UTF-8 BOM).
 * @param {string} filename - The name of the file to download (e.g. 'catalogo_productos.csv')
 * @param {Array<string>} headers - The header titles
 * @param {Array<Array<any>>} rows - The data rows
 */
export function exportToCsv(filename, headers, rows) {
    if (!rows || rows.length === 0) {
        throw new Error("No hay datos para exportar.");
    }

    const escapeField = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const headerLine = headers.map(escapeField).join(";");
    const dataLines = rows.map((row) => row.map(escapeField).join(";"));

    const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

