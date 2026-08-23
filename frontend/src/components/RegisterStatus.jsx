function RegisterStatus({
    register,
    isClosing,
    onClose,
}) {
    const isOpen = Boolean(register);

    return (
        <div className="
            border-t
            border-[var(--border)]
            p-4
        ">
            <div className="
                border
                border-[var(--border)]
                bg-[var(--surface-muted)]
                p-4
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    gap-3
                ">
                    <span className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-wide
                        text-[var(--text-secondary)]
                    ">
                        Caja
                    </span>

                    <span className={`
                        h-2
                        w-2
                        rounded-full
                        ${isOpen
                            ? "bg-[var(--success)]"
                            : "bg-[var(--danger)]"
                        }
                    `} />
                </div>


                <p className="
                    mt-2
                    text-sm
                    font-semibold
                    text-[var(--text-primary)]
                ">
                    {isOpen
                        ? "Abierta"
                        : "Cerrada"}
                </p>


                {isOpen && (
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isClosing}
                        className="
                            mt-4
                            w-full
                            border
                            border-[var(--danger-border)]
                            px-3
                            py-2
                            text-left
                            text-xs
                            font-semibold
                            text-[var(--danger)]
                            transition
                            hover:bg-[var(--danger-bg)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {isClosing
                            ? "Cerrando..."
                            : "Cerrar caja"}
                    </button>
                )}

            </div>
        </div>
    );
}

export default RegisterStatus;