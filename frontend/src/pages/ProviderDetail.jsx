import toast from "react-hot-toast";
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
    getProvider,
    updateProvider,
    createProvider,
    deleteProvider,
    getTransactions,
    getProducts,
    getCategories,
    bulkAssignProductProvider,
    getMethodLabel,
    getTransactionLabel,
} from "../services/business";

import ConfirmDialog from "../components/ConfirmDialog";
import ProviderMovementModal from "../components/providers/ProviderMovementModal";
import AssignProductsToProviderModal from "../components/providers/AssignProductsToProviderModal";
import { formatCurrency } from "../utils/formatCurrency";
import { formatStockQty, formatUnitType } from "../utils/formatStock";

function ProviderDetail({ isNewProvider = false }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [provider, setProvider] = useState(isNewProvider ? {} : null);
    const [transactions, setTransactions] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    // Active tab: 'products' | 'movements' | 'info'
    const [activeTab, setActiveTab] = useState("products");
    const [productSearch, setProductSearch] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Modals
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [unlinkingProductId, setUnlinkingProductId] = useState(null);

    async function loadData() {
        if (isNewProvider) {
            setIsLoading(false);
            return;
        }

        try {
            const [providerData, transactionData, prodsData, catsData] = await Promise.all([
                getProvider(id),
                getTransactions(),
                getProducts(),
                getCategories(),
            ]);

            setProvider(providerData);
            setAllProducts(prodsData || []);
            setCategories(catsData || []);

            setTransactions(
                (transactionData || []).filter((transaction) =>
                    (transaction.operations || []).some(
                        (op) =>
                            Number(op.provider) === Number(id) ||
                            Number(op.provider?.id) === Number(id)
                    )
                )
            );

            setName(providerData.name || "");
            setPhone(providerData.phone || "");
            setNotes(providerData.notes || "");
        } catch (error) {
            console.error("Error loading provider details:", error);
            toast.error("No se pudo cargar el proveedor.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [id, isNewProvider]);

    // Filter products assigned to this provider
    const assignedProducts = useMemo(() => {
        if (!provider?.id) return [];
        return allProducts.filter(
            (p) =>
                Number(p.provider) === Number(provider.id) ||
                Number(p.provider?.id) === Number(provider.id)
        );
    }, [allProducts, provider?.id]);

    // Search filtered products within the tab
    const filteredAssignedProducts = useMemo(() => {
        if (!productSearch.trim()) return assignedProducts;
        const q = productSearch.toLowerCase().trim();
        return assignedProducts.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                (p.category_name && p.category_name.toLowerCase().includes(q))
        );
    }, [assignedProducts, productSearch]);

    // Inventory metrics for this provider
    const inventoryValuation = useMemo(() => {
        return assignedProducts.reduce((acc, p) => {
            const cost = Number(p.cost_price) || 0;
            const qty = Number(p.stock_quantity) || 0;
            return acc + (cost > 0 && qty > 0 ? cost * qty : 0);
        }, 0);
    }, [assignedProducts]);

    async function handleSave(event) {
        event.preventDefault();

        if (!name.trim()) {
            toast.error("El nombre es obligatorio.");
            return;
        }

        setIsSaving(true);

        try {
            const data = {
                name: name.trim(),
                phone: phone.trim(),
                notes: notes.trim(),
            };

            const savedProvider = isNewProvider
                ? await createProvider(data)
                : await updateProvider(id, data);

            setProvider(savedProvider);

            toast.success(
                isNewProvider ? "Proveedor creado." : "Proveedor actualizado."
            );

            if (isNewProvider) {
                navigate(`/providers/${savedProvider.id}`);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                isNewProvider
                    ? "No se pudo crear el proveedor."
                    : "No se pudo actualizar el proveedor."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        setIsDeleting(true);

        try {
            await deleteProvider(id);
            toast.success("Proveedor eliminado.");
            navigate("/providers");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el proveedor.");
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    }

    async function handleUnlinkSingleProduct(productId) {
        try {
            await bulkAssignProductProvider([productId], null);
            toast.success("Producto desvinculado del proveedor.");
            loadData();
        } catch (error) {
            console.error("Error unlinking product:", error);
            toast.error("No se pudo desvincular el producto.");
        } finally {
            setUnlinkingProductId(null);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                    <span>Cargando información del proveedor...</span>
                </div>
            </div>
        );
    }

    if (!provider && !isNewProvider) {
        return (
            <div className="mx-auto max-w-4xl p-8 text-center">
                <p className="text-base font-bold text-[var(--text-primary)]">Proveedor no encontrado</p>
                <button
                    onClick={() => navigate("/providers")}
                    className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-hover)]"
                >
                    Volver a proveedores
                </button>
            </div>
        );
    }

    // Sort operations for transaction ledger
    const providerOperations = transactions
        .flatMap((tx) =>
            (tx.operations || [])
                .filter(
                    (op) =>
                        Number(op.provider) === Number(id) ||
                        Number(op.provider?.id) === Number(id)
                )
                .map((op) => ({
                    ...op,
                    transactionId: tx.id,
                    created_at: tx.created_at,
                }))
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    function getProviderMovement(op) {
        const debtAmount = (op.amounts || []).reduce(
            (total, amount) =>
                total + (amount.method === "debt" ? Number(amount.amount) || 0 : 0),
            0
        );

        const paidAmount = (op.amounts || []).reduce(
            (total, amount) =>
                total + (amount.method !== "debt" ? Number(amount.amount) || 0 : 0),
            0
        );

        if (debtAmount > 0) {
            return {
                label: "Deuda Pendiente",
                amount: debtAmount,
                sign: "+",
                className: "text-[var(--danger)]",
            };
        }

        return {
            label:
                op.type === "provider_payment"
                    ? "Pago a Proveedor"
                    : "Compra a Proveedor",
            amount: paidAmount,
            sign: "",
            className: "text-[var(--text-primary)]",
        };
    }

    // Formatted clean WhatsApp number
    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
            {/* TOP NAVIGATION / BREADCRUMB */}
            <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <button
                    type="button"
                    onClick={() => navigate("/providers")}
                    className="hover:text-[var(--text-primary)] hover:underline"
                >
                    Proveedores
                </button>
                <span>/</span>
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                    {isNewProvider ? "Nuevo Proveedor" : provider.name}
                </span>
            </div>

            {/* HEADER */}
            <header className="flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    {/* Avatar Initials */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-xl font-black text-[var(--primary)] border border-[var(--primary)]/20 shadow-inner">
                        {isNewProvider
                            ? "+"
                            : (provider.name || "P").slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[var(--surface-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Proveedor Comercial
                            </span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                            {isNewProvider ? "Nuevo Proveedor" : provider.name}
                        </h1>

                        {!isNewProvider && provider.phone && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                                <a
                                    href={`tel:${provider.phone}`}
                                    className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)]"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                    <span>{provider.phone}</span>
                                </a>

                                {cleanPhone && (
                                    <a
                                        href={`https://wa.me/${cleanPhone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.974-.974 5.968 5.968 0 0 1 1.057-4.035A7.886 7.886 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                        </svg>
                                        <span>Enviar WhatsApp</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {!isNewProvider && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsMovementModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Registrar compra / pago</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={isDeleting}
                            className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)]/80 disabled:opacity-50"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </button>
                    </div>
                )}
            </header>

            {/* KPI OVERVIEW METRICS */}
            {!isNewProvider && (
                <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* CARD 1: Saldo Adeudado */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:border-[var(--primary)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Saldo Adeudado (Debo)
                            </p>
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                                Number(provider.outstanding_debt || 0) > 0 ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                            }`}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                        </div>

                        <p className={`mt-3 text-2xl font-black tabular-nums ${
                            Number(provider.outstanding_debt || 0) > 0
                                ? "text-[var(--warning)]"
                                : "text-[var(--text-primary)]"
                        }`}>
                            {formatCurrency(provider.outstanding_debt || 0)}
                        </p>

                        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                            {Number(provider.outstanding_debt || 0) > 0
                                ? "Saldo pendiente acumulado a pagar."
                                : "Sin deuda pendiente con este proveedor."}
                        </p>
                    </div>

                    {/* CARD 2: Productos Asignados */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:border-[var(--primary)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Productos Asignados
                            </p>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                </svg>
                            </div>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                                {assignedProducts.length}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                                artículos
                            </span>
                        </div>

                        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                            Valuación stock: <span className="font-bold text-[var(--text-primary)]">{formatCurrency(inventoryValuation)}</span>
                        </p>
                    </div>

                    {/* CARD 3: En Caja Actual */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:border-[var(--primary)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Compras en Caja Actual
                            </p>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-accent)] text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v8.25m0 0a60.07 60.07 0 0 0 15.797 2.101c.727.198 1.453-.342 1.453-1.096V14.25m-17.25 0A60.07 60.07 0 0 1 19.5 12V6a.75.75 0 0 0-.75-.75H3.75" />
                                </svg>
                            </div>
                        </div>

                        <p className="mt-3 text-2xl font-black tabular-nums text-[var(--text-primary)]">
                            {formatCurrency(provider.current_register_total || 0)}
                        </p>

                        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                            {provider.current_register_transactions || 0}{" "}
                            {(provider.current_register_transactions || 0) === 1
                                ? "operación en este turno"
                                : "operaciones en este turno"}
                        </p>
                    </div>

                    {/* CARD 4: Historial Total */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition hover:border-[var(--primary)]/40">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Historial Total
                            </p>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-accent)] text-[var(--text-secondary)]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                        </div>

                        <p className="mt-3 text-2xl font-black tabular-nums text-[var(--text-primary)]">
                            {providerOperations.length}
                        </p>

                        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                            Movimientos históricos registrados
                        </p>
                    </div>
                </section>
            )}

            {/* SEGMENTED TABS (Only for existing providers) */}
            {!isNewProvider ? (
                <div className="mt-8">
                    <div className="flex border-b border-[var(--border)] gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("products")}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                                activeTab === "products"
                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Productos Suministrados</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                activeTab === "products"
                                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                            }`}>
                                {assignedProducts.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("movements")}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                                activeTab === "movements"
                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Historial de Movimientos</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                activeTab === "movements"
                                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                                    : "bg-[var(--surface-accent)] text-[var(--text-secondary)]"
                            }`}>
                                {providerOperations.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("info")}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                                activeTab === "info"
                                    ? "border-[var(--primary)] text-[var(--primary)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                        >
                            <span>Información & Notas</span>
                        </button>
                    </div>

                    {/* TAB 1: PRODUCTOS SUMINISTRADOS */}
                    {activeTab === "products" && (
                        <div className="mt-6 space-y-4">
                            {/* Actions bar for products */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="relative w-full sm:w-80">
                                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Buscar entre los productos de este proveedor..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    />
                                    {productSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setProductSearch("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    <span>+ Vincular productos</span>
                                </button>
                            </div>

                            {/* Products Table or Empty State */}
                            {assignedProducts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                                        </svg>
                                    </div>
                                    <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                                        Sin productos vinculados
                                    </h3>
                                    <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
                                        Asigná los artículos que te abastece este proveedor para llevar el control de costos y compras.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAssignModalOpen(true)}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)]"
                                    >
                                        + Vincular productos ahora
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)]/40 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[10px]">
                                                <tr>
                                                    <th className="px-5 py-3">Producto</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                    <th className="px-4 py-3 text-right">Costo</th>
                                                    <th className="px-4 py-3 text-right">Precio Venta</th>
                                                    <th className="px-4 py-3 text-right">Margen</th>
                                                    <th className="px-4 py-3 text-center">Stock Actual</th>
                                                    <th className="px-4 py-3 text-right">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {filteredAssignedProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                                                            No hay productos que coincidan con la búsqueda "{productSearch}".
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredAssignedProducts.map((p) => {
                                                        const cost = Number(p.cost_price) || 0;
                                                        const sale = Number(p.sale_price) || 0;
                                                        const margin = cost > 0 ? (((sale - cost) / cost) * 100).toFixed(0) : null;
                                                        const stock = Number(p.stock_quantity) || 0;
                                                        const minStock = Number(p.min_stock) || 1;
                                                        const isLowStock = p.track_stock && stock <= minStock && stock > 0;
                                                        const isOutOfStock = p.track_stock && stock <= 0;

                                                        return (
                                                            <tr key={p.id} className="transition hover:bg-[var(--surface-accent)]/40">
                                                                <td className="px-5 py-3">
                                                                    <div className="font-bold text-[var(--text-primary)]">
                                                                        {p.name}
                                                                    </div>
                                                                    {p.barcode && (
                                                                        <div className="font-mono text-[10px] text-[var(--text-secondary)]">
                                                                            {p.barcode}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                                    {p.category_name || "Sin categoría"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                                                                    {cost > 0 ? formatCurrency(cost) : "-"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                                                                    {formatCurrency(sale)}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {margin ? `+${margin}%` : "-"}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {p.track_stock ? (
                                                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                                                            isOutOfStock
                                                                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                                                                : isLowStock
                                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                        }`}>
                                                                            {formatStockQty(stock, p.unit_type)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] text-[var(--text-secondary)] italic">
                                                                            Sin control
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setUnlinkingProductId(p.id)}
                                                                        className="rounded-lg p-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                                                                        title="Desvincular producto"
                                                                    >
                                                                        Desvincular
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: HISTORIAL DE MOVIMIENTOS */}
                    {activeTab === "movements" && (
                        <div className="mt-6">
                            {providerOperations.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                                    <p className="font-bold text-[var(--text-primary)]">Sin movimientos registrados</p>
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        Este proveedor todavía no tiene compras o pagos registrados.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
                                    <div className="divide-y divide-[var(--border)]">
                                        {providerOperations.map((op) => {
                                            const movement = getProviderMovement(op);
                                            return (
                                                <div
                                                    key={op.id}
                                                    className="flex items-center justify-between gap-6 px-6 py-4 transition hover:bg-[var(--surface-accent)]/30"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-xs text-[var(--text-primary)]">
                                                                {movement.label}
                                                            </p>
                                                            <span className="rounded bg-[var(--surface-accent)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                                                                {getTransactionLabel(op.type)}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                            {new Date(op.created_at).toLocaleString("es-AR", {
                                                                dateStyle: "medium",
                                                                timeStyle: "short",
                                                            })}
                                                        </p>

                                                        {op.amounts && (
                                                            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                                                                {op.amounts
                                                                    .map((amount) => `${getMethodLabel(amount.method)}: ${formatCurrency(amount.amount)}`)
                                                                    .join(" · ")}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="shrink-0 text-right">
                                                        <p className={`text-base font-black tabular-nums ${movement.className}`}>
                                                            {movement.sign}{formatCurrency(movement.amount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: INFORMACIÓN & NOTAS */}
                    {activeTab === "info" && (
                        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                            <form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Nombre comercial
                                    </label>
                                    <input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                        placeholder="Ej: Distribuidora Central"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Teléfono / WhatsApp
                                    </label>
                                    <input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                        placeholder="Ej: +54 9 11 1234-5678"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                        Notas o condiciones de compra
                                    </label>
                                    <textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                        placeholder="Días de reparto, plazos de pago, contacto de vendedor..."
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-2 sm:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving || isDeleting}
                                        className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                                    >
                                        {isSaving ? "Guardando..." : "Guardar cambios"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteDialog(true)}
                                        disabled={isSaving || isDeleting}
                                        className="rounded-xl border border-[var(--danger-border)] px-4 py-2.5 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:opacity-50"
                                    >
                                        Eliminar proveedor
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ) : (
                /* FORM FOR NEW PROVIDER */
                <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
                    <form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Nombre del proveedor *
                            </label>
                            <input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Ej: Arcor Distribuidora"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Teléfono de contacto
                            </label>
                            <input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Ej: 11 5555-5555"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Notas adicionales
                            </label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="mt-2 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                placeholder="Horarios de entrega, lista de precios..."
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2 sm:col-span-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
                            >
                                {isSaving ? "Creando..." : "Crear Proveedor"}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/providers")}
                                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-accent)]"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CONFIRM DELETE DIALOG */}
            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar proveedor"
                    message={
                        <div>
                            <div>¿Querés eliminar al proveedor "{provider?.name}"?</div>
                            <div className="mt-2 text-xs text-[var(--text-secondary)]">
                                Los productos vinculados pasarán a no tener proveedor asignado. Esta acción no se puede deshacer.
                            </div>
                        </div>
                    }
                    confirmLabel="Eliminar proveedor"
                    cancelLabel="Cancelar"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteDialog(false)}
                    isLoading={isDeleting}
                />
            )}

            {/* CONFIRM UNLINK PRODUCT DIALOG */}
            {unlinkingProductId && (
                <ConfirmDialog
                    title="Desvincular producto"
                    message="¿Querés desvincular este producto del proveedor? El producto no será eliminado de tu catálogo."
                    confirmLabel="Desvincular"
                    cancelLabel="Cancelar"
                    onConfirm={() => handleUnlinkSingleProduct(unlinkingProductId)}
                    onCancel={() => setUnlinkingProductId(null)}
                />
            )}

            {/* MOVEMENT / PAYMENT MODAL */}
            <ProviderMovementModal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                initialProvider={provider}
                onSuccess={loadData}
            />

            {/* BULK ASSIGN PRODUCTS MODAL */}
            <AssignProductsToProviderModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                provider={provider}
                allProducts={allProducts}
                categories={categories}
                onSuccess={loadData}
            />
        </div>
    );
}

export default ProviderDetail;
