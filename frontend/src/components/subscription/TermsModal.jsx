import { useState } from "react";

export function TermsModal({ isOpen, onClose, initialTab = "terms" }) {
    const [activeTab, setActiveTab] = useState(initialTab); // "terms" | "privacy"

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 animate-fadeIn">
            <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--surface-accent)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                                Términos del Servicio & Privacidad
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Marco de uso del software (SaaS) y protección de datos comerciales
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                        aria-label="Cerrar modal de términos"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-[var(--border)] bg-[var(--surface)] px-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab("terms")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
                            activeTab === "terms"
                                ? "border-[var(--primary)] text-[var(--primary)]"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        <span>Términos del Servicio</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("privacy")}
                        className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition ${
                            activeTab === "privacy"
                                ? "border-[var(--primary)] text-[var(--primary)]"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                        <span>Privacidad & Propiedad de Datos</span>
                    </button>
                </div>

                {/* BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 text-xs text-[var(--text-secondary)] leading-relaxed space-y-4">
                    {activeTab === "terms" && (
                        <div className="space-y-4 animate-fadeIn">
                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    1. Objeto y Licencia de Uso
                                </h3>
                                <p>
                                    Business Manager es una plataforma de software como servicio (SaaS) destinada a la administración integral de puntos de venta (POS), control de stock, gestión de caja, métricas financieras y cuentas corrientes para comercios minoristas y mayoristas.
                                </p>
                                <p>
                                    La contratación de cualquiera de los planes otorga al titular una licencia de uso no exclusiva, intransferible y revocable para operar el sistema en sus terminales habilitadas durante la vigencia del período abonado.
                                </p>
                            </section>

                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    2. Período de Prueba Gratuita (Free Trial)
                                </h3>
                                <p>
                                    Todo nuevo usuario registrado cuenta con un período de prueba gratuito de 14 (catorce) días corridos con acceso irrestricto a todas las funcionalidades del Plan Premium. La activación del período de prueba no requiere tarjeta de crédito ni compromiso de contratación posterior. Al expirar los 14 días, el acceso al sistema requerirá la adquisición de un plan activo.
                                </p>
                            </section>

                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    3. Planes, Precios y Formas de Pago
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-[var(--text-primary)]">
                                    <li><strong>Plan Básico:</strong> $9.900 / mes o $99.000 / año (incluye 2 meses bonificados).</li>
                                    <li><strong>Plan Premium:</strong> $19.900 / mes o $199.000 / año (incluye 2 meses bonificados).</li>
                                </ul>
                                <p>
                                    Los pagos son procesados mediante pasarelas autorizadas (Mercado Pago, transferencias bancarias y QR interoperable). Al tratarse de renovaciones manuales prepagas, nunca se efectúan débitos automáticos no autorizados sobre las cuentas bancarias o tarjetas de los usuarios.
                                </p>
                            </section>

                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    4. Acumulación No Superpuesta de Tiempo
                                </h3>
                                <p>
                                    El sistema cuenta con un mecanismo de consumo escalonado: en caso de que una cuenta cuente con días vigentes del Plan Básico y adquiera tiempo del Plan Premium, el período Premium se consumirá en primer término. Una vez finalizado el tiempo Premium, la cuenta continuará utilizando de forma automática sus días restantes de Plan Básico sin interrupciones ni pérdida de saldo.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === "privacy" && (
                        <div className="space-y-4 animate-fadeIn">
                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    1. Propiedad Exclusiva de los Datos
                                </h3>
                                <p>
                                    Toda la información registrada por el comercio en Business Manager —incluyendo listas de precios, catálogo de artículos, cuentas corrientes de clientes, márgenes de ganancia, registros de caja y libreta de proveedores— es de <strong>propiedad única y exclusiva del comercio titular</strong>.
                                </p>
                            </section>

                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    2. Confidencialidad y No Comercialización
                                </h3>
                                <p>
                                    Business Manager se compromete a no vender, ceder, transferir ni divulgar bajo ninguna circunstancia los datos comerciales de sus usuarios a terceros, competidores, distribuidores o entidades publicitarias.
                                </p>
                            </section>

                            <section className="space-y-1.5">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    3. Resguardo y Exportación de la Información
                                </h3>
                                <p>
                                    El comerciante tiene derecho a exportar su catálogo, balances y movimientos en cualquier momento a través de las herramientas de descarga en formatos interoperables (CSV y planillas de cálculo), garantizando que su negocio nunca quede cautivo ni bloqueado.
                                </p>
                            </section>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 bg-[var(--surface-accent)]">
                    <span className="text-[11px] text-[var(--text-secondary)]">
                        Validez territorial: República Argentina · Versión 2.0
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TermsModal;
