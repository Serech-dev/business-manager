import { useState } from "react";
import toast from "react-hot-toast";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

function ChangePinModal({ isOpen, onClose }) {
    const { setOwnerPin } = useDeviceSecurity();
    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    if (!isOpen) return null;

    function handleSubmit(e) {
        e.preventDefault();
        const cleanCurrent = currentPin.trim();
        const cleanNew = newPin.trim();
        const cleanConfirm = confirmPin.trim();

        if (!cleanCurrent) {
            toast.error("Ingresá tu PIN actual.");
            return;
        }

        if (cleanNew.length < 4) {
            toast.error("El nuevo PIN debe tener al menos 4 números.");
            return;
        }

        if (cleanNew !== cleanConfirm) {
            toast.error("Los nuevos PINs no coinciden.");
            return;
        }

        const success = setOwnerPin(cleanCurrent, cleanNew);
        if (success) {
            setCurrentPin("");
            setNewPin("");
            setConfirmPin("");
            onClose();
        }
    }

    return (
        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/60
            p-4
            backdrop-blur-xs
        ">
            <div className="
                w-full
                max-w-sm
                border
                border-[var(--border)]
                bg-[var(--surface)]
                p-6
                shadow-2xl
            ">
                <h2 className="
                    text-base
                    font-bold
                    text-[var(--text-primary)]
                ">
                    Cambiar PIN de Dueño
                </h2>

                <p className="
                    mt-1
                    text-xs
                    text-[var(--text-secondary)]
                ">
                    Ingresá el PIN actual (por defecto 1234) para autorizar la creación de tu nuevo PIN.
                </p>

                <form onSubmit={handleSubmit} autoComplete="off" className="mt-4 space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            PIN Actual
                        </label>
                        <input
                            name="bm_current_pin"
                            type="password"
                            autoComplete="one-time-code"
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="PIN actual (por defecto 1234)"
                            maxLength={8}
                            className="
                                mt-1
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--background)]
                                px-3
                                py-2
                                text-sm
                                font-bold
                                tracking-widest
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            Nuevo PIN
                        </label>
                        <input
                            name="bm_new_pin"
                            type="password"
                            autoComplete="one-time-code"
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Nuevo PIN (mín. 4 dígitos)"
                            maxLength={8}
                            className="
                                mt-1
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--background)]
                                px-3
                                py-2
                                text-sm
                                font-bold
                                tracking-widest
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            Confirmar nuevo PIN
                        </label>
                        <input
                            name="bm_confirm_pin"
                            type="password"
                            autoComplete="one-time-code"
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Repetí el nuevo PIN"
                            maxLength={8}
                            className="
                                mt-1
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--background)]
                                px-3
                                py-2
                                text-sm
                                font-bold
                                tracking-widest
                                text-[var(--text-primary)]
                                outline-none
                                focus:border-[var(--primary)]
                                focus:ring-2
                                focus:ring-[var(--primary)]/20
                            "
                        />
                    </div>

                    <div className="mt-5 flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                flex-1
                                rounded-md
                                border
                                border-[var(--border)]
                                py-2
                                text-xs
                                font-medium
                                text-[var(--text-secondary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                                hover:text-[var(--text-primary)]
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="
                                flex-1
                                rounded-md
                                bg-[var(--primary)]
                                py-2
                                text-xs
                                font-bold
                                text-white
                                transition
                                hover:bg-[var(--primary-hover)]
                            "
                        >
                            Guardar PIN
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ChangePinModal;
