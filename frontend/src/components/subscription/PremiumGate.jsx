import React from "react";
import { useSubscriptionTier } from "../../hooks/useSubscriptionTier";

export function PremiumGate({
    feature,
    title = "Funcionalidad Premium",
    description = "Esta herramienta forma parte del Plan Premium de Business Manager.",
    benefits = [],
    children,
    fallback,
}) {
    const { isPremium, hasFeature, openSubscriptionModal } = useSubscriptionTier();

    const hasAccess = feature ? hasFeature(feature) : isPremium;

    if (hasAccess) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xs relative overflow-hidden">
            {/* AMBIENT TOP ACCENT LINE */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/40" />

            {/* MINIMALIST ACCENT ICON CONTAINER */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
            </div>

            <div className="mt-4 max-w-md mx-auto space-y-2">
                <span className="badge-gold inline-flex px-2.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider">
                    Plan Premium
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
            </div>

            {benefits && benefits.length > 0 && (
                <div className="mt-5 max-w-sm mx-auto text-left rounded-md border border-[var(--border)] bg-[var(--surface-accent)] p-4 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                        Beneficios incluidos en Premium:
                    </p>
                    <ul className="space-y-1.5 text-xs text-[var(--text-primary)]">
                        {benefits.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-amber-500 dark:text-amber-400 font-bold shrink-0">✓</span>
                                <span>{b}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={openSubscriptionModal}
                    className="w-full sm:w-auto rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold px-6 py-2.5 text-xs uppercase tracking-wider shadow-xs transition"
                >
                    Mejorar a Plan Premium ($20.000/mes)
                </button>
            </div>
        </div>
    );
}

export default PremiumGate;
