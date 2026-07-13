import {
  Calculator,
  Download,
  FileText,
  Plus,
  Printer,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiService, getErrorMessage } from '../services/api'
import type { OrderCalculationResult, Product } from '../types/api'
import { preciseMoney as money } from '../utils/format'

interface QuoteLine {
  clientId: number
  productId: string
  quantity: string
}

interface FinancialInputs {
  discountPercentage: string
  taxPercentage: string
  shippingAmount: string
}

function newLine(clientId: number): QuoteLine {
  return { clientId, productId: '', quantity: '1' }
}

function csvCell(value: string | number) {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) text = `'${text}`
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function exportQuote(result: OrderCalculationResult) {
  const rows: Array<Array<string | number>> = [
    ['Wholesale Hub quote calculation'],
    ['Generated', new Date().toISOString()],
    [],
    ['Product', 'Merchant', 'Quantity', 'Unit price', 'Line total'],
    ...result.items.map((item) => [
      item.productName,
      item.merchantName,
      item.quantity,
      item.unitPrice,
      item.lineTotal,
    ]),
    [],
    ['Subtotal', result.subtotal],
    [`Discount (${result.discountPercentage}%)`, -result.discountAmount],
    ['Taxable amount', result.taxableAmount],
    [`Tax (${result.taxPercentage}%)`, result.taxAmount],
    ['Shipping', result.shippingAmount],
    ['Grand total', result.grandTotal],
  ]
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wholesale-quote-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function QuoteCalculatorPage() {
  const nextId = useRef(2)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lines, setLines] = useState<QuoteLine[]>([newLine(1)])
  const [financials, setFinancials] = useState<FinancialInputs>({
    discountPercentage: '0',
    taxPercentage: '0',
    shippingAmount: '0',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<OrderCalculationResult | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const rows = await apiService.getAll<Product>('/products')
      setProducts(rows.filter((product) => product.status.toLowerCase() === 'active'))
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const selectedIds = useMemo(
    () => new Set(lines.map((line) => Number(line.productId)).filter(Boolean)),
    [lines],
  )

  const draftSubtotal = useMemo(() => lines.reduce((total, line) => {
    const product = productMap.get(Number(line.productId))
    const quantity = Number(line.quantity)
    return total + (product && Number.isFinite(quantity) && quantity > 0 ? product.price * quantity : 0)
  }, 0), [lines, productMap])

  function clearResult() {
    setResult(null)
    setErrors((current) => ({ ...current, form: '' }))
  }

  function updateLine(clientId: number, key: 'productId' | 'quantity', value: string) {
    setLines((current) => current.map((line) => line.clientId === clientId ? { ...line, [key]: value } : line))
    setErrors((current) => {
      const next = { ...current }
      delete next[key === 'productId' ? `product-${clientId}` : `quantity-${clientId}`]
      delete next.items
      delete next.form
      return next
    })
    clearResult()
  }

  function addLine() {
    setLines((current) => [...current, newLine(nextId.current++)])
    setErrors((current) => ({ ...current, items: '' }))
    clearResult()
  }

  function removeLine(clientId: number) {
    setLines((current) => current.filter((line) => line.clientId !== clientId))
    setErrors((current) => {
      const next = { ...current }
      delete next[`product-${clientId}`]
      delete next[`quantity-${clientId}`]
      return next
    })
    clearResult()
  }

  function updateFinancial(key: keyof FinancialInputs, value: string) {
    setFinancials((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      delete next.form
      return next
    })
    clearResult()
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (lines.length === 0) nextErrors.items = 'Add at least one product to calculate a quote.'
    if (lines.length > 100) nextErrors.items = 'A quote can contain at most 100 product lines.'
    const seen = new Set<number>()
    for (const line of lines) {
      const productId = Number(line.productId)
      const quantity = Number(line.quantity)
      if (!line.productId || !productMap.has(productId)) {
        nextErrors[`product-${line.clientId}`] = 'Select an active product.'
      } else if (seen.has(productId)) {
        nextErrors[`product-${line.clientId}`] = 'This product is already included.'
      } else {
        seen.add(productId)
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
        nextErrors[`quantity-${line.clientId}`] = 'Use a whole quantity from 1 to 100,000.'
      }
    }

    const discount = Number(financials.discountPercentage)
    const tax = Number(financials.taxPercentage)
    const shipping = Number(financials.shippingAmount)
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      nextErrors.discountPercentage = 'Discount must be from 0% to 100%.'
    }
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      nextErrors.taxPercentage = 'Tax must be from 0% to 100%.'
    }
    if (!Number.isFinite(shipping) || shipping < 0) {
      nextErrors.shippingAmount = 'Shipping cannot be negative.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    setCalculating(true)
    setErrors({})
    try {
      setResult(await apiService.calculateOrderTotal({
        items: lines.map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity),
        })),
        discountPercentage: Number(financials.discountPercentage),
        taxPercentage: Number(financials.taxPercentage),
        shippingAmount: Number(financials.shippingAmount),
      }))
      window.setTimeout(() => document.getElementById('quote-result')?.focus(), 0)
    } catch (error) {
      setErrors({ form: getErrorMessage(error) })
    } finally {
      setCalculating(false)
    }
  }

  function reset() {
    nextId.current += 1
    setLines([newLine(nextId.current)])
    setFinancials({ discountPercentage: '0', taxPercentage: '0', shippingAmount: '0' })
    setErrors({})
    setResult(null)
  }

  if (loading) {
    return <div className="skeleton skeleton-large" aria-label="Loading quote calculator" />
  }

  if (loadError) {
    return (
      <section className="error-state">
        <Calculator size={42} aria-hidden="true" />
        <h2>Calculator unavailable</h2>
        <p>{loadError}</p>
        <button className="button primary" type="button" onClick={() => void loadProducts()}>Try again</button>
      </section>
    )
  }

  return (
    <section className="quote-page">
      <div className="page-intro quote-intro">
        <div>
          <span className="eyebrow">Pricing tool</span>
          <h2>Wholesale quote calculator</h2>
          <p>Calculate volume totals, discount, tax, and shipping with current catalog prices.</p>
        </div>
        <button className="button secondary" type="button" onClick={reset}>
          <RefreshCcw size={16} aria-hidden="true" />
          Reset quote
        </button>
      </div>

      {products.length === 0 ? (
        <div className="alert error" role="alert">No active products are available for calculation.</div>
      ) : null}
      {errors.form ? <div className="alert error" role="alert">{errors.form}</div> : null}

      <form className="calculator-grid" onSubmit={(event) => void calculate(event)} noValidate>
        <section className="panel calculator-form-panel" aria-labelledby="quote-items-title">
          <header className="section-heading product-lines-heading">
            <span className="section-icon"><FileText size={19} aria-hidden="true" /></span>
            <div>
              <h3 id="quote-items-title">Quote items</h3>
              <p>Add active products and requested bulk quantities.</p>
            </div>
            <button className="button secondary compact-button" type="button" onClick={addLine} disabled={lines.length >= 100}>
              <Plus size={16} aria-hidden="true" />
              Add item
            </button>
          </header>
          {errors.items ? <div className="inline-error" role="alert">{errors.items}</div> : null}

          <div className="quote-lines">
            {lines.length === 0 ? (
              <div className="builder-empty">
                <p>No products in this quote.</p>
                <button className="button secondary" type="button" onClick={addLine}>Add first product</button>
              </div>
            ) : lines.map((line, index) => {
              const product = productMap.get(Number(line.productId))
              const quantity = Number(line.quantity)
              const lineTotal = product && Number.isFinite(quantity) && quantity > 0 ? product.price * quantity : 0
              const productErrorId = `quote-product-${line.clientId}-error`
              const quantityErrorId = `quote-quantity-${line.clientId}-error`
              return (
                <fieldset className="quote-line" key={line.clientId}>
                  <legend>Quote item {index + 1}</legend>
                  <span className="line-number" aria-hidden="true">{index + 1}</span>
                  <label className="form-field product-select-field">
                    <span>Product *</span>
                    <select
                      value={line.productId}
                      onChange={(event) => updateLine(line.clientId, 'productId', event.target.value)}
                      aria-invalid={Boolean(errors[`product-${line.clientId}`])}
                      aria-describedby={errors[`product-${line.clientId}`] ? productErrorId : undefined}
                    >
                      <option value="">Select a product</option>
                      {products.map((option) => (
                        <option
                          key={option.id}
                          value={option.id}
                          disabled={selectedIds.has(option.id) && Number(line.productId) !== option.id}
                        >
                          {option.name} · {option.merchantName} · {money.format(option.price)}
                        </option>
                      ))}
                    </select>
                    {errors[`product-${line.clientId}`] ? <small className="field-error" id={productErrorId}>{errors[`product-${line.clientId}`]}</small> : null}
                  </label>
                  <label className="form-field quantity-field">
                    <span>Quantity *</span>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.clientId, 'quantity', event.target.value)}
                      aria-invalid={Boolean(errors[`quantity-${line.clientId}`])}
                      aria-describedby={errors[`quantity-${line.clientId}`] ? quantityErrorId : undefined}
                    />
                    {errors[`quantity-${line.clientId}`] ? <small className="field-error" id={quantityErrorId}>{errors[`quantity-${line.clientId}`]}</small> : null}
                  </label>
                  <div className="line-price">
                    <span>Line total</span>
                    <strong>{money.format(lineTotal)}</strong>
                  </div>
                  <button
                    className="icon-button danger remove-line"
                    type="button"
                    onClick={() => removeLine(line.clientId)}
                    aria-label={`Remove quote item ${index + 1}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </fieldset>
              )
            })}
          </div>

          <div className="quote-adjustments">
            <label className="form-field">
              <span>Discount (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={financials.discountPercentage}
                onChange={(event) => updateFinancial('discountPercentage', event.target.value)}
                aria-invalid={Boolean(errors.discountPercentage)}
              />
              {errors.discountPercentage ? <small className="field-error">{errors.discountPercentage}</small> : null}
            </label>
            <label className="form-field">
              <span>Tax (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={financials.taxPercentage}
                onChange={(event) => updateFinancial('taxPercentage', event.target.value)}
                aria-invalid={Boolean(errors.taxPercentage)}
              />
              {errors.taxPercentage ? <small className="field-error">{errors.taxPercentage}</small> : null}
            </label>
            <label className="form-field">
              <span>Shipping amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={financials.shippingAmount}
                onChange={(event) => updateFinancial('shippingAmount', event.target.value)}
                aria-invalid={Boolean(errors.shippingAmount)}
              />
              {errors.shippingAmount ? <small className="field-error">{errors.shippingAmount}</small> : null}
            </label>
          </div>
          <footer className="calculator-actions">
            <div>
              <span>Draft product subtotal</span>
              <strong>{money.format(draftSubtotal)}</strong>
            </div>
            <button className="button primary" type="submit" disabled={calculating || products.length === 0}>
              <Calculator size={17} aria-hidden="true" />
              {calculating ? 'Calculating…' : 'Calculate quote'}
            </button>
          </footer>
        </section>

        <aside
          className={`panel quote-result ${result ? 'has-result' : ''}`}
          id="quote-result"
          tabIndex={-1}
          aria-live="polite"
        >
          {!result ? (
            <div className="quote-placeholder">
              <span><Calculator size={28} aria-hidden="true" /></span>
              <h3>Quote summary</h3>
              <p>Complete the product lines and select Calculate quote to get a server-verified total.</p>
            </div>
          ) : (
            <div className="print-quote">
              <header className="result-header">
                <div>
                  <span className="eyebrow">Calculated quote</span>
                  <h3>Wholesale Hub</h3>
                  <p>{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
                <span>{result.totalQuantity.toLocaleString()} units</span>
              </header>
              <dl className="price-breakdown">
                <div><dt>Subtotal</dt><dd>{money.format(result.subtotal)}</dd></div>
                <div><dt>Discount ({result.discountPercentage}%)</dt><dd>−{money.format(result.discountAmount)}</dd></div>
                <div><dt>Taxable amount</dt><dd>{money.format(result.taxableAmount)}</dd></div>
                <div><dt>Tax ({result.taxPercentage}%)</dt><dd>{money.format(result.taxAmount)}</dd></div>
                <div><dt>Shipping</dt><dd>{money.format(result.shippingAmount)}</dd></div>
                <div className="grand-total"><dt>Grand total</dt><dd>{money.format(result.grandTotal)}</dd></div>
              </dl>
              <p className="result-note">Pricing was verified against the current active product catalog.</p>
              <div className="quote-result-actions no-print">
                <button className="button secondary" type="button" onClick={() => exportQuote(result)}>
                  <Download size={16} aria-hidden="true" />
                  Export CSV
                </button>
                <button className="button primary" type="button" onClick={() => window.print()}>
                  <Printer size={16} aria-hidden="true" />
                  Print quote
                </button>
              </div>
            </div>
          )}
        </aside>
      </form>
    </section>
  )
}
