import { useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useOnboarding } from "../context/OnboardingContext";

function GuideModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState("caja");
    const location = useLocation();
    const { startTour, resetAllTours } = useOnboarding();

    if (!isOpen) return null;

    const currentTourKey =
        location.pathname === "/"
            ? "dashboard"
            : location.pathname.startsWith("/transactions/new")
            ? "new-sale"
            : location.pathname.startsWith("/products")
            ? "products"
            : location.pathname.startsWith("/stock")
            ? "stock"
            : location.pathname.startsWith("/providers")
            ? location.pathname === "/providers" || location.pathname === "/providers/"
                ? "providers"
                : "provider-detail"
            : null;

    function handleStartCurrentTour() {
        if (!currentTourKey) return;
        onClose();
        setTimeout(() => {
            startTour(currentTourKey, true);
        }, 150);
    }

    function handleResetAllTours() {
        resetAllTours();
        toast.success("Tutoriales visuales reiniciados.");
        onClose();
        if (currentTourKey) {
            setTimeout(() => {
                startTour(currentTourKey, true);
            }, 150);
        }
    }

    const tabs = [
        { id: "caja", label: "Caja & Cierres" },
        { id: "ventas", label: "Ventas & Libreta" },
        { id: "stock", label: "Stock & Control" },
        { id: "proveedores", label: "Proveedores & Gastos" },
        { id: "seguridad", label: "Seguridad & Reportes" },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                            Centro de Ayuda
                        </p>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Guía del Sistema
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {currentTourKey && (
                            <button
                                type="button"
                                onClick={handleStartCurrentTour}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition"
                                title="Iniciar recorrido con punteros visuales en esta pantalla"
                            >
                                <span>🎯</span>
                                <span>Ver recorrido interactivo</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                            aria-label="Cerrar guía"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 5 TABS - CLEAN RESPONSIVE ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                rounded-md
                                px-3
                                py-2
                                text-xs
                                font-bold
                                text-center
                                transition
                                ${
                                    activeTab === tab.id
                                        ? "bg-[var(--primary)] text-white shadow-xs"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[var(--text-primary)]">
                    {activeTab === "caja" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Apertura y Cierre de Caja
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Al iniciar la jornada o turno, presioná <strong>"Abrir caja"</strong> en el Panel Principal. Todas las ventas, salidas y cobros se acumulan en esa caja. Al terminar, presioná <strong>"Cerrar caja"</strong> en la barra lateral para generar el reporte de recaudación.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Reabrir caja para corregir errores
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Si cerraste la caja pero olvidaste registrar un gasto o corregir un cobro, el dueño puede usar <strong>"Reabrir último cierre"</strong> para desprecintar la caja anterior, hacer los ajustes necesarios y volver a cerrarla.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Transferencias no recibidas
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Si una transferencia bancaria no impactó al momento del cierre, el sistema te permite elegir: confirmarla cuando llegue, pasarla a la cuenta corriente del cliente como saldo deudor, o anularla.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "ventas" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Ventas y Pagos Divididos
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Desde <strong>"Nueva venta"</strong> podés registrar cobros dividiendo el pago en varios medios (ej: parte en Efectivo y parte por Transferencia o Tarjeta).
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Ventas A Cuenta (Libreta / Cuenta Corriente)
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Al seleccionar <strong>A cuenta</strong>, es obligatorio asignar a qué cliente corresponde. Si el cliente tiene <strong>saldo a favor</strong>, el sistema lo descuenta de allí; si no, aumenta su deuda hasta que realice un pago.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Migración de cuadernos y Pagos a Cuenta
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Al crear un cliente podés cargar su <strong>"Saldo deudor inicial"</strong> para migrar deudas de papel. Cuando venga a pagar o deje dinero a favor, entrás a su ficha y usás <strong>"+ Registrar pago a cuenta"</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "stock" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Descuento Automático y Alertas
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Cada venta descuenta automáticamente la cantidad vendida del inventario (por unidad o peso exacto en Kg/100g). Si un producto queda en 1 o menos unidades, el sistema te mostrará una alerta de <strong>Stock bajo</strong> o <strong>Agotado</strong>.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Ingreso de Mercadería en Lote
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Con <strong>"Registrar Ingreso de Stock"</strong> podés cargar reposiciones por proveedor sumando múltiples productos en un solo movimiento, actualizando precios de costo y registrando el pago al contado o a deber.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Ajustes Rápidos y Mermas
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Si tenés roturas, productos vencidos, pérdidas o realizás un recuento físico, usá el botón de <strong>Ajuste</strong> en la tabla para corregir el stock y dejar registrado el motivo para auditoría.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Libreta de Notas y Faltantes
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    En la pestaña <strong>"Notas & pedidos"</strong> podés anotar mercadería faltante para el próximo pedido y marcarla como completada cuando llegue la reposición.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "proveedores" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Ficha Integral y Enlace a WhatsApp
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Hacé clic en cualquier proveedor para ver su saldo adeudado (<strong>Debo</strong>), la valuación del stock que te abastece y un botón directo para <strong>abrir chat de WhatsApp</strong> o llamarlo al instante.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Vincular Productos en Lote
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Dentro de la ficha del proveedor podés usar <strong>"+ Vincular productos"</strong> para asignar en lote qué artículos te provee, o seleccionarlos con las casillas en la lista general de Productos y presionar <strong>"Asignar Proveedor"</strong>.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Pagos, Compras y Salidas de Caja
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Podés registrar compras de mercadería descontando el dinero de la caja activa o sumándolo a tu saldo deudor pendiente para pagar más adelante.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "seguridad" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Modo Caja (Terminal de Empleados)
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    En la PC del mostrador podés activar <strong>"Modo Caja"</strong> desde la barra lateral. Esto permite a los empleados cobrar y registrar ventas normalmente, pero bloquea el cierre de caja, borrado de operaciones y reportes confidenciales detrás del PIN de Dueño.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    PIN de Dueño
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    El PIN inicial por defecto es <code>1234</code>. Podés cambiarlo en cualquier momento desde el menú de usuario en la esquina inferior izquierda.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Reportes y Franjas Horarias
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    En <strong>"Reportes & Métricas"</strong> podés analizar el rendimiento del negocio dividido en bloques (Mañana, Tarde, Noche) y ver las 24 barras de actividad diaria para detectar tu <strong>Hora Pico</strong> de mayor facturación.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)] px-6 py-3">
                    <button
                        type="button"
                        onClick={handleResetAllTours}
                        className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition"
                        title="Vuelve a activar las guías visuales automáticas en todas las pantallas"
                    >
                        🔄 Reiniciar todas las guías visuales
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)]"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuideModal;
