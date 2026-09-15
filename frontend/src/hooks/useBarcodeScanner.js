import { useEffect, useRef } from "react";

/**
 * useBarcodeScanner
 * 
 * Listens for rapid keystroke sequences emitted by USB / Bluetooth hardware barcode readers (HID keyboard emulation).
 * Works globally without requiring focus on any specific input field, and seamlessly intercepts scanner input
 * even if focus happens to be in a search input.
 * 
 * @param {Function} onScan - Callback function called when a complete barcode is scanned: (barcode) => void
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - Whether the listener is active
 * @param {number} [options.maxInterval=100] - Maximum ms between keystrokes to be considered hardware scanning
 * @param {number} [options.minLength=3] - Minimum length of barcode string
 * @param {boolean} [options.stopPropagation=true] - Whether to stop event propagation on scanner Enter
 */
export function useBarcodeScanner(onScan, {
    enabled = true,
    maxInterval = 100,
    minLength = 3,
    stopPropagation = true,
} = {}) {
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    const bufferRef = useRef("");
    const lastKeyTimeRef = useRef(0);
    const timeoutRef = useRef(null);
    const isScanningRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        function handleKeyDown(e) {
            // Ignore pure modifier keys (Shift, Ctrl, Alt, Meta, CapsLock, Tab)
            if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) {
                return;
            }

            const now = Date.now();
            const timeDiff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            // Clear any pending timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (e.key === "Enter") {
                const scannedCode = bufferRef.current.trim();
                const wasFastScan = isScanningRef.current || scannedCode.length >= 6;

                if (wasFastScan && scannedCode.length >= minLength) {
                    if (stopPropagation) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    onScanRef.current?.(scannedCode);
                }

                // Reset state
                bufferRef.current = "";
                isScanningRef.current = false;
                return;
            }

            // Single printable character
            if (e.key.length === 1) {
                if (timeDiff > maxInterval) {
                    // Start of a potential new rapid sequence or manual typing
                    bufferRef.current = e.key;
                    isScanningRef.current = false;
                } else {
                    // Rapid keystroke sequence
                    bufferRef.current += e.key;
                    if (bufferRef.current.length >= 2) {
                        isScanningRef.current = true;
                    }
                }

                // Schedule a buffer wipe after 300ms of inactivity (so manual slow typing doesn't leave stale buffers)
                timeoutRef.current = setTimeout(() => {
                    bufferRef.current = "";
                    isScanningRef.current = false;
                }, 300);
            }
        }

        window.addEventListener("keydown", handleKeyDown, true);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, maxInterval, minLength, stopPropagation]);
}
