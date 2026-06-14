const USD_TO_INR_ESTIMATE = 83

export function convertEstimatedUsdToInr(usd: number): number {
  return Number((usd * USD_TO_INR_ESTIMATE).toFixed(4))
}

export function formatEstimatedInrFromUsd(usd: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(convertEstimatedUsdToInr(usd))
}
