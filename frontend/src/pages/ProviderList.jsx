import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    getProviders,
} from "../services/business";

import ProviderMovementModal from "../components/providers/ProviderMovementModal";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import PremiumGate from "../components/subscription/PremiumGate";
import { formatCurrency } from "../utils/formatCurrency";
import { useSubscriptionTier } from "../hooks/useSubscriptionTier";

const PROVIDERS_TOUR_STEPS = [
    {
        target: '[data-tour="providers-create-btn"]',
        title: "Nuevo Proveedor",
        content: "Registrá distribuidores y vendedores con sus datos de contacto y notas comerciales.",
        position: "bottom",
    },
    {
        target: '[data-tour="providers-movement-btn"]',
        title: "Compras y Pagos",
        content: "Registrá compras de mercadería al contado o a pagar, y pagos de deudas pendientes.",
        position: "bottom",
    },
    {
        target: '[data-tour="providers-search"]',
        title: "Búsqueda Rápida",
        content: "Buscá proveedores por nombre comercial o número de teléfono.",
        position: "bottom",
    },
    {
        target: '[data-tour="providers-list"]',
        title: "Ficha del Proveedor",
        content: "Hacé clic en cualquier proveedor para ver su saldo deudor ('Debo'), historial y vincular productos en lote.",
        position: "top",
    },
];

function ProviderList() {
    const navigate = useNavigate();
    const { isPremium, hasFeature } = useSubscriptionTier();

    const [providers, setProviders] = useState([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

    async function loadProviders() {
        if (!isPremium && !hasFeature("provider_debts")) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await getProviders();
            setProviders(data);
        } catch (error) {
            if (
                error?.response?.status === 403 ||
                error?.isFeatureRequiresPremium ||
                error?.isSubscriptionExpired
            ) {
                return;
            }
            console.error(error);
            toast.error("No se pudieron cargar los proveedores.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadProviders();
    }, [isPremium, hasFeature]);

    const filteredProviders = providers.filter(
        (provider) =>
            provider.name.toLowerCase().includes(search.toLowerCase()) ||
            provider.phone?.includes(search)
    );

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-xs text-[var(--text-secondary)]">
                Cargando proveedores...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-8 py-8">
            <PremiumGate
                feature="provider_debts"
                title="Libreta de Proveedores & Cuentas por Pagar"
                description="Llevá el control integral de distribuidores, mercadería a crédito, fechas de vencimiento de facturas y pagos realizados."
                benefits={[
                    "Registro de distribuidores y representantes comerciales",
                    "Seguimiento de compras a pagar y saldos adeudados a proveedores",
                    "Vinculación directa de productos con sus proveedores y costos",
                    "Historial de compras y pagos con comprobantes",
                ]}
            >
                {/* HEADER */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Proveedores
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                            Gestión de Proveedores
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            data-tour="providers-create-btn"
                            onClick={() => navigate("/providers/new")}
                            className="rounded-md bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition"
                        >
                            + Nuevo Proveedor
                        </button>

                        <button
                            type="button"
                            data-tour="providers-movement-btn"
                            onClick={() => setIsMovementModalOpen(true)}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-accent)] transition"
                        >
                            + Registrar Compra / Pago
                        </button>
                    </div>
                </header>

                {/* SEARCH */}
                <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md" data-tour="providers-search">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                        <svg className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>

                    <span className="text-xs text-[var(--text-secondary)]">
                        {filteredProviders.length} {filteredProviders.length === 1 ? "proveedor" : "proveedores"}
                    </span>
                </div>

                {/* TABLE / LIST */}
                <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden" data-tour="providers-list">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-accent)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Contacto</th>
                                <th className="px-6 py-3 text-right">Saldo Deudor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filteredProviders.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-xs text-[var(--text-secondary)]">
                                        {search ? "No se encontraron proveedores que coincidan con la búsqueda." : "No hay proveedores registrados aún."}
                                    </td>
                                </tr>
                            ) : (
                                filteredProviders.map((prov) => (
                                    <tr
                                        key={prov.id}
                                        onClick={() => navigate(`/providers/${prov.id}`)}
                                        className="cursor-pointer hover:bg-[var(--surface-accent)] transition"
                                    >
                                        <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{prov.name}</td>
                                        <td className="px-6 py-4 text-[var(--text-secondary)]">{prov.phone || "-"}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--danger)]">
                                            {formatCurrency(prov.balance || 0)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <ProviderMovementModal
                    isOpen={isMovementModalOpen}
                    onClose={() => setIsMovementModalOpen(false)}
                    onSuccess={loadProviders}
                />

                <OnboardingTour
                    tourKey="providers"
                    steps={PROVIDERS_TOUR_STEPS}
                />
            </PremiumGate>
        </div>
    );
}

export default ProviderList;