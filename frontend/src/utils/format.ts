const requestedCurrency = String(import.meta.env.VITE_CURRENCY ?? 'USD').trim().toUpperCase()

function currencyFormatter(options: Intl.NumberFormatOptions) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: requestedCurrency,
      ...options,
    })
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      ...options,
    })
  }
}

export const wholeMoney = currencyFormatter({ maximumFractionDigits: 0 })

export const preciseMoney = currencyFormatter({
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const compactMoney = currencyFormatter({
  notation: 'compact',
  maximumFractionDigits: 1,
})
