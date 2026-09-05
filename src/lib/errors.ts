export const ERROR_CODES = {
    BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
    DUPLICATE_URL: "DUPLICATE_URL",
    INVALID_STATUS: "INVALID_STATUS",
} as const;

export type AppErrorCode =
    (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function isUniqueViolation(
    error: unknown,
    constraintName?: string,
): boolean {
    let current: unknown = error;

    while (current && typeof current === "object") {
        const candidate = current as {
            code?: string;
            constraint_name?: string;
            cause?: unknown;
        };

        if (
            candidate.code === "23505" &&
            (!constraintName ||
                candidate.constraint_name === constraintName)
        ) {
            return true;
        }

        current = candidate.cause;
    }

    return false;
}
