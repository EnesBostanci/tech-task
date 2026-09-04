export function calculatePayout(
    views: number,
    payoutPer1kViews: number,
): number {
    if (!Number.isInteger(views) || views < 0) {
        throw new Error("Views must be a non-negative integer");
    }

    if (!Number.isInteger(payoutPer1kViews) || payoutPer1kViews < 0) {
        throw new Error("Payout rate must be a non-negative integer");
    }

    return Math.floor(views / 1000) * payoutPer1kViews;
}