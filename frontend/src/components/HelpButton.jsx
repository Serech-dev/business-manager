import { useState } from "react";

function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="
                    fixed
                    bottom-5
                    right-5
                    z-50
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    border
                    border-[var(--border)]
                    bg-[var(--surface)]
                    text-lg
                    font-bold
                    text-[var(--text-primary)]
                    shadow-sm
                    transition
                    hover:bg-[var(--surface-accent)]
                "
                aria-label="Abrir ayuda"
            >
                ?
            </button>

            {isOpen && (
                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-black/30
                        px-4
                    "
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="
                            w-full
                            max-w-lg
                            border
                            border-[var(--border)]
                            bg-[var(--surface)]
                            p-6
                            shadow-lg
                        "
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="
                            flex
                            items-center
                            justify-between
                            gap-4
                        ">
                            <h2 className="
                                text-xl
                                font-bold
                                text-[var(--text-primary)]
                            ">
                                Ayuda
                            </h2>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="
                                    px-2
                                    py-1
                                    text-lg
                                    text-[var(--text-secondary)]
                                    hover:text-[var(--text-primary)]
                                "
                                aria-label="Cerrar ayuda"
                            >
                                ×
                            </button>
                        </div>

                        <div className="
                            mt-5
                            space-y-5
                            text-sm
                        ">
                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Abrir caja
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Inicia una nueva caja para registrar
                                    las operaciones del día.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Cerrar caja
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Finaliza la caja actual y genera un
                                    resumen de todos sus movimientos.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Nueva operación
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Registra un movimiento de dinero,
                                    como una venta, gasto, pago o ingreso.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Fiado
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Registra una venta que el cliente
                                    todavía no pagó. La deuda no cuenta
                                    como dinero disponible hasta recibir
                                    el pago.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Proveedores
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Permite registrar deudas y pagos
                                    realizados a proveedores.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Transferencia pendiente
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Una transferencia que todavía no fue
                                    confirmada como recibida. Cuando llegue,
                                    podés marcarla como recibida.
                                </p>
                            </div>

                            <div>
                                <h3 className="
                                    font-semibold
                                    text-[var(--text-primary)]
                                ">
                                    Historial de cajas
                                </h3>

                                <p className="
                                    mt-1
                                    text-[var(--text-secondary)]
                                ">
                                    Permite consultar cajas anteriores y
                                    revisar los movimientos registrados
                                    durante cada una.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default HelpButton;