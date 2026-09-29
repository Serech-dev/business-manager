import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { submitFeedback } from "../../services/feedback";

export default function UserFeedbackModal({ isOpen, onClose }) {
    const location = useLocation();
    const [feedbackType, setFeedbackType] = useState("bug");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error("Por favor ingresá un detalle o descripción.");
            return;
        }

        setIsSubmitting(true);
        try {
            const deviceInfo = `${window.innerWidth}x${window.innerHeight} (${
                window.innerWidth < 768 ? "Mobile/Tablet" : "Desktop"
            })`;

            await submitFeedback({
                feedback_type: feedbackType,
                subject: subject.trim(),
                message: message.trim(),
                page_url: location.pathname || window.location.pathname,
                device_info: deviceInfo,
            });

            toast.success("¡Gracias! Recibimos tu mensaje y lo vamos a revisar.");
            setSubject("");
            setMessage("");
            setFeedbackType("bug");
            onClose();
        } catch (err) {
            console.error("Error submitting feedback:", err);
            toast.error("No se pudo enviar el reporte. Por favor intentá nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
            <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 bg-[var(--surface-accent)] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">
                                Reportar Error o Sugerir Cambio
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Tu opinión nos ayuda a mejorar el sistema continuamente
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* FORM BODY */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                    {/* TYPE SELECTOR (3 SHARP CARDS) */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                            Tipo de Mensaje
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {/* BUG */}
                            <button
                                type="button"
                                onClick={() => setFeedbackType("bug")}
                                className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition ${
                                    feedbackType === "bug"
                                        ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                                }`}
                            >
                                <svg className="h-4 w-4 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="text-xs">Error / Bug</span>
                            </button>

                            {/* SUGGESTION */}
                            <button
                                type="button"
                                onClick={() => setFeedbackType("suggestion")}
                                className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition ${
                                    feedbackType === "suggestion"
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-bold"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                                }`}
                            >
                                <svg className="h-4 w-4 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                </svg>
                                <span className="text-xs">Sugerencia</span>
                            </button>

                            {/* INQUIRY */}
                            <button
                                type="button"
                                onClick={() => setFeedbackType("inquiry")}
                                className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition ${
                                    feedbackType === "inquiry"
                                        ? "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                                }`}
                            >
                                <svg className="h-4 w-4 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                                </svg>
                                <span className="text-xs">Consulta</span>
                            </button>
                        </div>
                    </div>

                    {/* SUBJECT */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                            Asunto o Tema (Opcional)
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={
                                feedbackType === "bug"
                                    ? "Ej: Error al escanear código de barras"
                                    : feedbackType === "suggestion"
                                    ? "Ej: Agregar filtro por proveedor en compras"
                                    : "Ej: Cómo hacer un cierre de turno"
                            }
                            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* MESSAGE */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                            Descripción / Mensaje *
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={
                                feedbackType === "bug"
                                    ? "Contanos qué estabas haciendo, qué botón presionaste y qué error apareció..."
                                    : feedbackType === "suggestion"
                                    ? "Contanos tu idea o cómo te gustaría que funcione..."
                                    : "Escribí acá tu duda o consulta..."
                            }
                            rows={4}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                            required
                        />
                    </div>

                    {/* CONTEXT FOOTER INFO */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/50 p-2.5 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                        <svg className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        <span>
                            Se adjuntará automáticamente la pantalla actual (
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                                {location.pathname || "/"}
                            </span>
                            ) para acelerar la revisión.
                        </span>
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <span>Enviar Reporte</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
