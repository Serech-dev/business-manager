import { useEffect, useState, useRef, useCallback } from "react";
import { useOnboarding } from "../../context/OnboardingContext";

export default function OnboardingTour({
    tourKey,
    steps = [],
    autoStartDelay = 400,
}) {
    const {
        activeTour,
        activeStep,
        startTour,
        nextStep,
        prevStep,
        dismissTour,
        isTourDismissed,
    } = useOnboarding();

    const [targetRect, setTargetRect] = useState(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, placement: "bottom" });
    const popoverRef = useRef(null);

    const isActive = activeTour === tourKey;
    const currentStep = isActive && steps ? steps[activeStep] : null;

    // Auto-start tour if never permanently dismissed
    useEffect(() => {
        if (!tourKey || steps.length === 0) return;
        if (!isTourDismissed(tourKey) && activeTour === null) {
            const timer = setTimeout(() => {
                startTour(tourKey, false);
            }, autoStartDelay);
            return () => clearTimeout(timer);
        }
    }, [tourKey, steps, isTourDismissed, activeTour, startTour, autoStartDelay]);

    // Position calculation and viewport clamping
    const updatePosition = useCallback(() => {
        if (!currentStep) return;

        const targetEl = document.querySelector(currentStep.target);
        if (!targetEl) {
            // Target not found on page, fallback to center overlay
            setTargetRect(null);
            setPopoverPosition({
                top: Math.max(80, window.innerHeight / 2 - 120),
                left: Math.max(16, window.innerWidth / 2 - 170),
                placement: "center",
            });
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom,
        });

        // Compute preferred placement
        const preferredPlacement = currentStep.position || "auto";
        const popoverWidth = 340;
        const popoverHeight = 220;
        const padding = 12;

        let placement = preferredPlacement;
        if (preferredPlacement === "auto") {
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            if (spaceBelow >= popoverHeight + 20) {
                placement = "bottom";
            } else if (spaceAbove >= popoverHeight + 20) {
                placement = "top";
            } else {
                placement = "bottom";
            }
        }

        let top = 0;
        let left = 0;

        if (placement === "top") {
            top = rect.top - popoverHeight - padding;
            left = rect.left + rect.width / 2 - popoverWidth / 2;
        } else if (placement === "bottom") {
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - popoverWidth / 2;
        } else if (placement === "left") {
            top = rect.top + rect.height / 2 - popoverHeight / 2;
            left = rect.left - popoverWidth - padding;
        } else if (placement === "right") {
            top = rect.top + rect.height / 2 - popoverHeight / 2;
            left = rect.right + padding;
        }

        // Clamp to viewport
        const maxLeft = window.innerWidth - popoverWidth - 16;
        const maxTop = window.innerHeight - popoverHeight - 16;

        left = Math.max(16, Math.min(left, maxLeft));
        top = Math.max(16, Math.min(top, maxTop));

        setPopoverPosition({ top, left, placement });
    }, [currentStep]);

    // Scroll into view & update coordinates when active step changes
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const targetEl = document.querySelector(currentStep.target);
        if (targetEl) {
            targetEl.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            });
        }

        // Initial update and subsequent updates
        const timeout = setTimeout(() => {
            updatePosition();
        }, 100);

        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isActive, currentStep, activeStep, updatePosition]);

    // Keyboard navigation
    useEffect(() => {
        if (!isActive) return;

        function handleKeyDown(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                dismissTour(tourKey, false); // temporary close
            } else if (e.key === "ArrowRight" || e.key === "Enter") {
                if (activeStep < steps.length - 1) {
                    e.preventDefault();
                    nextStep();
                } else {
                    e.preventDefault();
                    dismissTour(tourKey, true); // complete and hide permanently
                }
            } else if (e.key === "ArrowLeft" && activeStep > 0) {
                e.preventDefault();
                prevStep();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isActive, activeStep, steps.length, dismissTour, nextStep, prevStep, tourKey]);

    if (!isActive || !currentStep) return null;

    const isLastStep = activeStep === steps.length - 1;

    return (
        <div className="fixed inset-0 z-50 pointer-events-auto">
            {/* BACKDROP WITH SPOTLIGHT HOLE CUTOUT FEEL */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300"
                onClick={() => dismissTour(tourKey, false)}
            />

            {/* TARGET HIGHLIGHT SPOTLIGHT BOX */}
            {targetRect && (
                <div
                    className="fixed pointer-events-none rounded-xl border-2 border-[var(--primary)] ring-4 ring-[var(--primary)]/25 shadow-2xl transition-all duration-300 ease-out z-50"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                    }}
                >
                    {/* PULSING CORNER BEACON */}
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--primary)] shadow-sm" />
                    </span>
                </div>
            )}

            {/* FLOATING POPOVER CARD */}
            <div
                ref={popoverRef}
                className="fixed z-50 w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl space-y-3 transition-all duration-200 ease-out select-none"
                style={{
                    top: `${popoverPosition.top}px`,
                    left: `${popoverPosition.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER: STEP BADGE & CLOSE */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="flex h-5 items-center justify-center rounded-md bg-[var(--primary)]/15 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">
                            Paso {activeStep + 1} de {steps.length}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[180px]">
                            {currentStep.title}
                        </h4>
                    </div>

                    <button
                        type="button"
                        onClick={() => dismissTour(tourKey, false)}
                        className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-accent)] hover:text-[var(--text-primary)] transition text-xs font-bold"
                        title="Cerrar por ahora (se mostrará nuevamente al recargar)"
                        aria-label="Cerrar tutorial"
                    >
                        ✕
                    </button>
                </div>

                {/* CONTENT */}
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] text-left">
                    {currentStep.content}
                </p>

                {/* FOOTER ACTIONS */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                    <button
                        type="button"
                        onClick={() => dismissTour(tourKey, true)}
                        className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] hover:underline transition"
                        title="No volver a mostrar este tutorial automáticamente"
                    >
                        No volver a mostrar
                    </button>

                    <div className="flex items-center gap-1.5">
                        {activeStep > 0 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface-accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition"
                            >
                                ← Anterior
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (isLastStep) {
                                    dismissTour(tourKey, true);
                                } else {
                                    nextStep();
                                }
                            }}
                            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--primary-hover)] transition active:scale-98"
                        >
                            {isLastStep ? "¡Entendido! ✓" : "Siguiente →"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
