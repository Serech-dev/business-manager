import { useState } from "react";

function GuideModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState("caja");

    if (!isOpen) return null;

    const tabs = [
        { id: "caja", label: "Caja & Cierres" },
        { id: "ventas", label: "Ventas & Libreta" },
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

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)]"
                        aria-label="Cerrar guía"
                    >
                        ✕
                    </button>
                </div>

                {/* 4 TABS - SINGLE CLEAN ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
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
                                    Al iniciar la jornada o turno, presioná <strong>"Abrir caja"</strong> en el Dashboard. Todas las ventas, salidas y cobros se acumulan en esa caja. Al terminar, presioná <strong>"Cerrar caja"</strong> en la barra lateral para generar el reporte de recaudación.
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
                                    Si una transferencia bancaria no impactó al momento del cierre, el sistema te permite elegir: confirmarla cuando llegue, pasarla a la libreta del cliente como fiado, o anularla.
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
                                    Ventas a Fiado (Libreta)
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Al seleccionar <strong>Fiado</strong>, es obligatorio asignar a qué cliente corresponde. El importe aumenta la deuda de su libreta y no suma efectivo a la caja hasta el momento en que el cliente realice el pago.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Migración de cuadernos y Cobro de deudas
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Al crear un cliente podés cargar su <strong>"Saldo deudor inicial"</strong> para migrar deudas de papel. Cuando venga a pagar, entrás a su ficha y usás <strong>"+ Registrar cobro"</strong> para saldar total o parcialmente su cuenta.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "proveedores" && (
                        <div className="space-y-3.5">
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Pagos y Salidas de Caja
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Tocando <strong>"- Registrar gasto / salida"</strong> en el Dashboard podés registrar pagos a repartidores o gastos generales del local, descontando el dinero físico de la caja activa.
                                </p>
                            </div>

                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)]/40 p-4 space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Compras Fiadas y Control de "Debo"
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Si un proveedor te baja mercadería pero no le pagás en el momento, podés registrarlo indicando el saldo pendiente. La etiqueta <strong>"Debo $X"</strong> te mantendrá al tanto de lo que le debés a cada distribuidor.
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
                <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-6 py-3">
                    <span className="text-xs text-[var(--text-secondary)]">
                        Accesible en cualquier momento desde el menú de usuario.
                    </span>
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
    );
}

export default GuideModal;
