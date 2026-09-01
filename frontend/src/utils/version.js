import rawVersion from "../../../version.md?raw";

export function getAppVersion() {
    const match = rawVersion.match(/(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.]+)?)/);
    return match ? `v${match[1]}` : "v1.0.0";
}

export const APP_VERSION = getAppVersion();

