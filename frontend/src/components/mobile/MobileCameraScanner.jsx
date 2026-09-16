import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { playBeepSuccess, playBeepWarning } from "../../utils/audio";

const BARCODE_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.QR_CODE,
];

/**
 * MobileCameraScanner
 * 
 * Embedded smartphone camera barcode reader for PWA and Mobile Simple Mode.
 * Features laser aiming guide, torch toggle, camera switcher, audio feedback, and debounce.
 * Gracefully handles unmounting and missing/denied camera permissions.
 */
export function MobileCameraScanner({
    onScan,
    onClose,
    title = "Lector de Barras",
    subtitle = "Apuntá la cámara al código del producto",
    continuous = true,
}) {
    const scannerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
    const scannerRef = useRef(null);
    const lastScannedRef = useRef({ code: "", timestamp: 0 });
    const isMountedRef = useRef(true);

    const [isStarting, setIsStarting] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    const [hasTorch, setHasTorch] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [lastDetected, setLastDetected] = useState(null);

    const handleBarcodeDetected = useCallback((decodedText) => {
        const now = Date.now();
        const code = String(decodedText).trim();

        // Prevent rapid duplicate scans within 1.2s for the exact same barcode
        if (lastScannedRef.current.code === code && (now - lastScannedRef.current.timestamp) < 1200) {
            return;
        }

        lastScannedRef.current = { code, timestamp: now };
        if (isMountedRef.current) {
            setLastDetected(code);
        }
        playBeepSuccess();

        if (onScan) {
            onScan(code);
        }

        if (!continuous && onClose) {
            setTimeout(onClose, 250);
        }
    }, [onScan, onClose, continuous]);

    const stopScannerSafely = useCallback(async () => {
        const instance = scannerRef.current;
        if (!instance) return;

        try {
            // Only stop if currently scanning (state 2 is SCANNING)
            if (instance.isScanning) {
                await instance.stop();
            }
        } catch {
            // Ignore any stop errors safely
        }

        try {
            instance.clear();
        } catch {
            // Ignore clear errors safely
        }
    }, []);

    const startScanner = useCallback(async (cameraIdOrConfig) => {
        try {
            if (!isMountedRef.current) return;
            setIsStarting(true);
            setCameraError(null);

            // Safely stop any previous instance
            await stopScannerSafely();

            if (!isMountedRef.current) return;

            const html5QrCode = new Html5Qrcode(scannerId, {
                formatsToSupport: BARCODE_FORMATS,
                verbose: false,
            });
            scannerRef.current = html5QrCode;

            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    return {
                        width: Math.floor(minEdge * 0.85),
                        height: Math.floor(minEdge * 0.55),
                    };
                },
                aspectRatio: 1.0,
            };

            const cameraParam = cameraIdOrConfig || { facingMode: "environment" };

            await html5QrCode.start(
                cameraParam,
                config,
                (decodedText) => handleBarcodeDetected(decodedText),
                () => {
                    // QR/Barcode search loop frame (normal)
                }
            );

            if (!isMountedRef.current) {
                await stopScannerSafely();
                return;
            }

            // Check if torch/flashlight capability exists
            try {
                const capabilities = html5QrCode.getRunningTrackCapabilities?.();
                if (capabilities && "torch" in capabilities) {
                    setHasTorch(true);
                }
            } catch {
                setHasTorch(false);
            }

            setIsStarting(false);
        } catch (err) {
            console.warn("Camera scanner notice:", err);
            if (isMountedRef.current) {
                const errStr = String(err?.name || err?.message || err);
                const isDenied = errStr.includes("NotAllowedError") || errStr.includes("Permission") || errStr.includes("denied");
                setCameraError(
                    isDenied
                        ? "Permiso de cámara denegado o no disponible en este dispositivo."
                        : "No se pudo acceder a la cámara. Verificá que no esté en uso por otra app."
                );
                setIsStarting(false);
                playBeepWarning();
            }
        }
    }, [scannerId, handleBarcodeDetected, stopScannerSafely]);

    // Initial camera startup & cleanup
    useEffect(() => {
        isMountedRef.current = true;

        async function init() {
            try {
                const devices = await Html5Qrcode.getCameras().catch(() => []);
                if (!isMountedRef.current) return;

                if (devices && devices.length > 0) {
                    setCameras(devices);
                    // Prefer rear / back camera
                    const backCam = devices.find(d =>
                        d.label.toLowerCase().includes("back") ||
                        d.label.toLowerCase().includes("trasera") ||
                        d.label.toLowerCase().includes("environment")
                    );
                    const initialCamId = backCam ? backCam.id : devices[0].id;
                    const initialIdx = devices.findIndex(d => d.id === initialCamId);
                    setCurrentCameraIndex(initialIdx >= 0 ? initialIdx : 0);
                    await startScanner(initialCamId);
                } else {
                    await startScanner({ facingMode: "environment" });
                }
            } catch {
                if (isMountedRef.current) {
                    await startScanner({ facingMode: "environment" });
                }
            }
        }

        init();

        return () => {
            isMountedRef.current = false;
            stopScannerSafely();
        };
    }, [startScanner, stopScannerSafely]);

    const toggleTorch = async () => {
        if (!scannerRef.current || !hasTorch) return;
        try {
            const nextState = !isTorchOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: nextState }],
            });
            setIsTorchOn(nextState);
        } catch (err) {
            console.error("Torch error:", err);
        }
    };

    const switchCamera = async () => {
        if (cameras.length <= 1) return;
        const nextIdx = (currentCameraIndex + 1) % cameras.length;
        setCurrentCameraIndex(nextIdx);
        await startScanner(cameras[nextIdx].id);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white select-none">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 z-10">
                <div>
                    <h3 className="font-semibold text-sm tracking-wide text-white flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        {title}
                    </h3>
                    <p className="text-xs text-slate-400">{subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                    {hasTorch && (
                        <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2 rounded-xl transition-colors ${
                                isTorchOn
                                    ? "bg-amber-500 text-slate-950 font-bold"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                            title="Linterna / Flash"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </button>
                    )}

                    {cameras.length > 1 && (
                        <button
                            type="button"
                            onClick={switchCamera}
                            className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
                            title="Cambiar Cámara"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 bg-slate-800 text-slate-300 hover:bg-rose-950 hover:text-rose-300 rounded-xl transition-colors"
                            title="Cerrar escáner"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Viewfinder View */}
            <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
                <div
                    id={scannerId}
                    className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                />

                {/* Laser Overlay Guide */}
                {!cameraError && !isStarting && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                        <div className="relative w-64 h-40 rounded-2xl border-2 border-dashed border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center">
                            {/* Scanning Red Laser Line */}
                            <div className="absolute left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse"></div>

                            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400"></div>
                            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400"></div>
                            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400"></div>
                        </div>

                        {lastDetected && (
                            <div className="mt-4 px-3 py-1 bg-emerald-500/90 text-slate-950 text-xs font-mono font-bold rounded-xl shadow-lg animate-bounce">
                                Código: {lastDetected}
                            </div>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isStarting && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm text-slate-300 font-medium">Iniciando cámara...</p>
                    </div>
                )}

                {/* Error State */}
                {cameraError && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h4 className="text-base font-semibold text-white mb-1">Cámara no disponible</h4>
                        <p className="text-xs text-slate-400 max-w-xs mb-4">{cameraError}</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => startScanner({ facingMode: "environment" })}
                                className="px-4 py-2 bg-[var(--primary)] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
                            >
                                Reintentar Conexión
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status Help */}
            <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                    Soporta códigos EAN-13, EAN-8, UPC, Code-128 y QR.
                </p>
            </div>
        </div>
    );
}

export default MobileCameraScanner;
