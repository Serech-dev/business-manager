function ConfirmDialog({
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
    isLoading = false,
}) {
    return (
        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/30
            px-4
        ">
            <div className="
                w-full
                max-w-md
                border
                border-[var(--border)]
                bg-[var(--surface)]
                p-6
                shadow-xl
            ">
                <h2 className="
                    text-lg
                    font-bold
                    text-[var(--text-primary)]
                ">
                    {title}
                </h2>

                <p className="
                    mt-2
                    text-sm
                    leading-6
                    text-[var(--text-secondary)]
                ">
                    {message}
                </p>

                <div className="
                    mt-6
                    flex
                    justify-end
                    gap-3
                ">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="
                            border
                            border-[var(--border)]
                            px-4
                            py-2
                            text-sm
                            font-medium
                            text-[var(--text-secondary)]
                            transition
                            hover:bg-[var(--surface-accent)]
                            hover:text-[var(--text-primary)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="
                            border
                            border-[var(--danger-border)]
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-[var(--danger)]
                            transition
                            hover:bg-[var(--danger-bg)]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {isLoading
                            ? "Cerrando..."
                            : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;