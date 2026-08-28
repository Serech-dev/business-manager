function TransactionBasicInfo({
    description,
    onChangeDescription,
}) {
    return (
        <section className="
            border
            border-[var(--border)]
            bg-[var(--surface)]
        ">
            <div className="p-5">
                <label
                    htmlFor="transaction-description"
                    className="
                        text-sm
                        font-medium
                        text-[var(--text-primary)]
                    "
                >
                    Descripción general de la transacción (opcional)
                </label>

                <input
                    id="transaction-description"
                    type="text"
                    value={description}
                    onChange={(event) =>
                        onChangeDescription(event.target.value)
                    }
                    className="
                        mt-2
                        w-full
                        rounded-md
                        border
                        border-[var(--border)]
                        bg-[var(--background)]
                        px-3
                        py-2.5
                        text-[var(--text-primary)]
                        outline-none
                        transition
                        placeholder:text-[var(--text-secondary)]
                        focus:border-[var(--primary)]
                        focus:ring-2
                        focus:ring-[var(--primary)]/20
                    "
                    placeholder="Ej: Cobro en mostrador / Compra de insumos y venta"
                />
            </div>
        </section>
    );
}

export default TransactionBasicInfo;
