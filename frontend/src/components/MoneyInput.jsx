import { useMemo } from "react";

function formatThousands(val) {
    if (val === "" || val === null || val === undefined) return "";
    let str = String(val).trim();
    if (!str) return "";

    // If input contains decimal points from backend strings (e.g., "0.00", "1500.00")
    if (str.includes(".")) {
        str = str.split(".")[0];
    } else if (str.includes(",")) {
        str = str.split(",")[0];
    }

    const digits = str.replace(/\D/g, "");
    if (!digits) return "";

    const parsedNumber = parseInt(digits, 10);
    if (isNaN(parsedNumber)) return "";

    return parsedNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function MoneyInput({
    value = "",
    onChange,
    placeholder = "0",
    className = "",
    disabled = false,
    autoFocus = false,
    id,
    name,
    ...rest
}) {
    const displayValue = useMemo(() => {
        return formatThousands(value);
    }, [value]);

    function handleChange(e) {
        let rawDigits = e.target.value.replace(/\D/g, "");
        if (rawDigits.length > 1 && rawDigits.startsWith("0")) {
            const parsed = parseInt(rawDigits, 10);
            rawDigits = isNaN(parsed) ? "" : String(parsed);
        }
        if (onChange) {
            const syntheticEvent = {
                ...e,
                target: {
                    ...e.target,
                    value: rawDigits,
                    name: name || e.target.name,
                },
            };
            onChange(syntheticEvent);
        }
    }

    function handleWheel(e) {
        e.currentTarget.blur();
    }

    return (
        <input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            onWheel={handleWheel}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={className}
            {...rest}
        />
    );
}

export default MoneyInput;
export { formatThousands };
