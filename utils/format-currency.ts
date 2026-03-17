export const formatCurrency = (amount: number | string | null | undefined) => {
    const numericAmount = Number(amount ?? 0);

    if (!Number.isFinite(numericAmount)) {
        return '$0.00';
    }

    return numericAmount.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};