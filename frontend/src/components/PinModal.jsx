import { useState, useEffect, useRef } from "react";
import { useDeviceSecurity } from "../context/DeviceSecurityContext";

function PinModal() {
    const { isPinModalOpen, unlockWithPin, closePinModal } = useDeviceSecurity();
    const [pin, setPin] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (isPinModalOpen) {
            setPin("");
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isPinModalOpen]);

    if (!isPinModalOpen) return null;

    function handleSubmit(event) {
        event?.preventDefault();
        if (!pin) return;
        const success = unlockWithPin(pin);
        if (!success) {
            setPin("");
            inputRef.current?.focus();
        }
    }

    function handleKeyPress(digit) {
        if (pin.length < 8) {
            const nextPin = pin + digit;
            setPin(nextPin);
            if (nextPin.length === 4) {
                // Auto-attempt unlock on 4 digits
                setTimeout(() => {
                    unlockWithPin(nextPin);
                }, 50);
            }
        }
    }

    function handleDelete() {
        setPin((prev) => prev.slice(0, -1));
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
                <div className="text-center">
                    <h2 className="
                        text-lg
                        font-bold
                        text-[var(--text-primary)]
                    ">
                        Acceso de Dueño
                    </h2>

                    <p className="
                        mt-1.5
                        text-xs
                        text-[var(--text-secondary)]
                    ">
                        Esta acción está protegida en Modo Caja. Ingresá el PIN de dueño para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="mt-5">
                    {/* PIN DISPLAY / INPUT */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            name="bm_pin_security"
                            type="password"
                            autoComplete="one-time-code"
                            data-1p-ignore="true"
                            data-lpignore="true"
                            data-form-type="other"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="PIN (por defecto 1234)"
                            maxLength={8}
                            className="
                                w-full
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--background)]
                                py-3
                                text-center
                                text-xl
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

                    {/* NUMPAD (FOR TOUCH OR MOUSE) */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => handleKeyPress(String(num))}
                                className="
                                    flex
                                    h-12
                                    items-center
                                    justify-center
                                    rounded-md
                                    border
                                    border-[var(--border)]
                                    bg-[var(--surface-accent)]/50
                                    text-lg
                                    font-bold
                                    text-[var(--text-primary)]
                                    transition
                                    hover:bg-[var(--surface-accent)]
                                    active:scale-95
                                "
                            >
                                {num}
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => setPin("")}
                            className="
                                flex
                                h-12
                                items-center
                                justify-center
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--surface-muted)]
                                text-xs
                                font-semibold
                                text-[var(--text-secondary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                            "
                        >
                            Borrar
                        </button>

                        <button
                            type="button"
                            onClick={() => handleKeyPress("0")}
                            className="
                                flex
                                h-12
                                items-center
                                justify-center
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--surface-accent)]/50
                                text-lg
                                font-bold
                                text-[var(--text-primary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                                active:scale-95
                            "
                        >
                            0
                        </button>

                        <button
                            type="button"
                            onClick={handleDelete}
                            className="
                                flex
                                h-12
                                items-center
                                justify-center
                                rounded-md
                                border
                                border-[var(--border)]
                                bg-[var(--surface-muted)]
                                text-xs
                                font-bold
                                text-[var(--text-secondary)]
                                transition
                                hover:bg-[var(--surface-accent)]
                            "
                        >
                            DEL
                        </button>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button
                            type="button"
                            onClick={closePinModal}
                            className="
                                flex-1
                                rounded-md
                                border
                                border-[var(--border)]
                                py-2.5
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
                            disabled={!pin}
                            className="
                                flex-1
                                rounded-md
                                bg-[var(--primary)]
                                py-2.5
                                text-xs
                                font-bold
                                text-white
                                shadow-sm
                                transition
                                hover:bg-[var(--primary-hover)]
                                disabled:opacity-50
                            "
                        >
                            Desbloquear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PinModal;

