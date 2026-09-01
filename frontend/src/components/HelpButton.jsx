import { useState } from "react";
import GuideModal from "./GuideModal";

function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="
                    fixed
                    bottom-4
                    right-4
                    z-40
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[var(--border)]
                    bg-[var(--surface)]
                    text-xs
                    font-bold
                    text-[var(--text-secondary)]
                    shadow-md
                    transition
                    hover:border-[var(--primary)]
                    hover:bg-[var(--surface-accent)]
                    hover:text-[var(--primary)]
                "
                title="Centro de ayuda y tutorial"
                aria-label="Abrir guía y ayuda"
            >
                ?
            </button>

            <GuideModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}

export default HelpButton;