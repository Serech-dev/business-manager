import { useState } from "react";
import ReceiptTicket from "./ReceiptTicket";

function ReceiptModal({
    isOpen,
    onClose,
    transaction,
    items = null,
}) {
    const [businessName, setBusinessName] = useState(() => {
        return localStorage.getItem("bm_receipt_business_name") || "Mi Negocio";
    });
    const [paperWidth, setPaperWidth] = useState(() => {
        return localStorage.getItem("bm_receipt_paper_width") || "58mm";
    });
    const [isEditingName, setIsEditingName] = useState(false);

    if (!isOpen || !transaction) return null;

    function handleNameChange(newName) {
        setBusinessName(newName);
        localStorage.setItem("bm_receipt_business_name", newName);
    }

    function handleWidthChange(newWidth) {
        setPaperWidth(newWidth);
        localStorage.setItem("bm_receipt_paper_width", newWidth);
    }

    function handlePrint() {
        window.print();
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 shrink-0 bg-[var(--surface-accent)]/40">
                    <div className="flex items-center gap-2">
                        <svg
                            className="h-4 w-4 text-[var(--primary)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.19-.37 3.229M6.72 13.829l-1.92 8.32a.75.75 0 0 0 .96.88l3.48-1.16 3.48 1.16a.75.75 0 0 0 .48 0l3.48-1.16 3.48 1.16a.75.75 0 0 0 .96-.88l-1.92-8.32"
                            />
                        </svg>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Imprimir Ticket / Comprobante
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                    >
                        ✕
                    </button>
                </div>

                {/* CONTROLS BAR (STORE NAME & PAPER WIDTH) */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-xs">
                    {/* Store name editor */}
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-secondary)]">Nombre:</span>
                        {isEditingName ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={businessName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    maxLength={40}
                                    placeholder="Nombre del local..."
                                    className="h-7 w-40 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsEditingName(false)}
                                    className="rounded-md bg-[var(--surface-accent)] px-2 py-1 text-[11px] font-bold text-[var(--primary)]"
                                >
                                    Listo
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditingName(true)}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-accent)]/80 px-2 py-1 font-bold text-[var(--text-primary)] hover:bg-[var(--surface-accent)]"
                                title="Click para cambiar nombre del negocio en el ticket"
                            >
                                <span>{businessName}</span>
                                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Paper width selector */}
                    <div className="flex items-center gap-1">
                        <span className="mr-1 text-[11px] text-[var(--text-secondary)]">Papel:</span>
                        <button
                            type="button"
                            onClick={() => handleWidthChange("58mm")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                paperWidth === "58mm"
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            58 mm
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWidthChange("80mm")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                paperWidth === "80mm"
                                    ? "bg-[var(--primary)] text-white shadow-xs"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            80 mm
                        </button>
                    </div>
                </div>

                {/* TICKET PREVIEW CANVAS */}
                <div className="flex-1 overflow-y-auto bg-neutral-900/60 p-6 flex justify-center items-start">
                    <div className="rounded-sm shadow-2xl ring-1 ring-black/20">
                        <ReceiptTicket
                            transaction={transaction}
                            items={items}
                            businessName={businessName}
                            paperWidth={paperWidth}
                        />
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                        Cerrar
                    </button>

                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[var(--primary-hover)] active:scale-98"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6.72 13.829c-.24-1.04-.37-2.12-.37-3.229 0-4.418 3.582-8 8-8s8 3.582 8 8c0 1.109-.13 2.19-.37 3.229M6.72 13.829l-1.92 8.32a.75.75 0 0 0 .96.88l3.48-1.16 3.48 1.16a.75.75 0 0 0 .48 0l3.48-1.16 3.48 1.16a.75.75 0 0 0 .96-.88l-1.92-8.32"
                            />
                        </svg>
                        <span>Imprimir Ticket</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReceiptModal;

