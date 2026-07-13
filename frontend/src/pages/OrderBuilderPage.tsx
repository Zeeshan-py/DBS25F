import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  PackagePlus,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiService, getErrorMessage } from '../services/api'
import type { CreatedOrder, Product, User } from '../types/api'
import { preciseMoney as money } from '../utils/format'

interface DraftLine {
  clientId: number
  productId: string
  quantity: string
}

const integer = new Intl.NumberFormat('en-US')

function firstLine(clientId: number): DraftLine {
  return { clientId, productId: '', quantity: '1' }
}

export function OrderBuilderPage() {
  const nextId = useRef(2)
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('Pending')
  const [lines, setLines] = useState<DraftLine[]>([firstLine(1)])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)

  const loadReferences = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [customerRows, productRows] = await Promise.all([
        apiService.getAll<User>('/users'),
        apiService.getAll<Product>('/products'),
      ])
      setUsers(customerRows)
      setProducts(productRows.filter((product) => product.status.toLowerCase() === 'active'))
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReferences()
  }, [loadReferences])

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const selectedProductIds = useMemo(
    () => new Set(lines.map((line) => Number(line.productId)).filter(Boolean)),
    [lines],
  )

  const totals = useMemo(() => lines.reduce(
    (result, line) => {
      const product = productsById.get(Number(line.productId))
      const quantity = Number(line.quantity)
      const validQuantity = product && Number.isFinite(quantity) && quantity > 0 ? quantity : 0
      return {
        units: result.units + validQuantity,
        subtotal: result.subtotal + (product?.price ?? 0) * validQuantity,
      }
    },
    { units: 0, subtotal: 0 },
  ), [lines, productsById])

  function updateLine(clientId: number, field: 'productId' | 'quantity', value: string) {
    setLines((current) => current.map((line) => (
      line.clientId === clientId ? { ...line, [field]: value } : line
    )))
    setErrors((current) => {
      const next = { ...current }
      delete next[`line-${clientId}-${field}`]
      delete next.items
      return next
    })
  }

  function addLine() {
    const clientId = nextId.current++
    setLines((current) => [...current, firstLine(clientId)])
  }

  function removeLine(clientId: number) {
    setLines((current) => current.filter((line) => line.clientId !== clientId))
    setErrors((current) => {
      const next = { ...current }
      delete next[`line-${clientId}-productId`]
      delete next[`line-${clientId}-quantity`]
      return next
    })
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!userId) nextErrors.userId = 'Select a customer for this order.'
    if (lines.length === 0) nextErrors.items = 'Add at least one product line.'
    if (lines.length > 100) nextErrors.items = 'An order can contain at most 100 product lines.'

    const seen = new Set<number>()
    for (const line of lines) {
      const productId = Number(line.productId)
      const quantity = Number(line.quantity)
      if (!line.productId || !productsById.has(productId)) {
        nextErrors[`line-${line.clientId}-productId`] = 'Select an active product.'
      } else if (seen.has(productId)) {
        nextErrors[`line-${line.clientId}-productId`] = 'This product is already in the order.'
      } else {
        seen.add(productId)
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
        nextErrors[`line-${line.clientId}-quantity`] = 'Enter a whole quantity from 1 to 100,000.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function resetForm() {
    nextId.current += 1
    setUserId('')
    setStatus('Pending')
    setLines([firstLine(nextId.current)])
    setErrors({})
    setCreatedOrder(null)
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})
    try {
      const order = await apiService.createOrderWithItems({
        userId: Number(userId),
        status,
        items: lines.map((line) => ({
          productId: Number(line.productId),
          quantity: Number(line.quantity),
        })),
      })
      setCreatedOrder(order)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrors({ form: getErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading" aria-label="Loading order builder">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-large" />
      </div>
    )
  }

  if (loadError) {
    return (
      <section className="error-state">
        <ShoppingCart size={42} aria-hidden="true" />
        <h2>Order builder unavailable</h2>
        <p>{loadError}</p>
        <button className="button primary" type="button" onClick={() => void loadReferences()}>
          Try again
        </button>
      </section>
    )
  }

  if (createdOrder) {
    return (
      <section className="order-success" aria-labelledby="order-success-title">
        <div className="success-hero">
          <span className="success-icon"><CheckCircle2 size={28} aria-hidden="true" /></span>
          <div>
            <span className="eyebrow">Order confirmed</span>
            <h2 id="order-success-title">Sales order #{createdOrder.id} was created</h2>
            <p>{createdOrder.userName} · {integer.format(createdOrder.totalQuantity)} total units</p>
          </div>
          <strong>{money.format(createdOrder.subtotal)}</strong>
        </div>

        <section className="panel receipt-panel" aria-label="Created order details">
          <header className="panel-header">
            <div>
              <h2>Order receipt</h2>
              <p>All product lines were saved in one database transaction.</p>
            </div>
            <span className="receipt-status">{createdOrder.status}</span>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Merchant</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {createdOrder.items.map((item) => (
                  <tr key={item.productId}>
                    <td><strong>{item.productName}</strong></td>
                    <td>{item.merchantName}</td>
                    <td>{integer.format(item.quantity)}</td>
                    <td>{money.format(item.unitPrice)}</td>
                    <td><strong>{money.format(item.lineTotal)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="success-actions">
          <button className="button primary" type="button" onClick={resetForm}>
            <Plus size={17} aria-hidden="true" />
            Create another order
          </button>
          <Link className="button secondary" to="/orders">
            View all orders
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="order-builder">
      <div className="page-intro order-builder-intro">
        <div>
          <span className="eyebrow">Sales operations</span>
          <h2>Create sales order</h2>
          <p>Build a multi-product order with live totals, then save it as one transaction.</p>
        </div>
        <Link className="button secondary" to="/orders">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to orders
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="alert error" role="alert">
          No active products are available. Activate a product before creating an order.
        </div>
      ) : null}
      {errors.form ? <div className="alert error" role="alert">{errors.form}</div> : null}

      <form className="order-builder-layout" onSubmit={(event) => void submitOrder(event)} noValidate>
        <div className="order-builder-main">
          <section className="panel order-section" aria-labelledby="order-details-title">
            <header className="section-heading">
              <span className="section-icon"><ReceiptText size={19} aria-hidden="true" /></span>
              <div>
                <h3 id="order-details-title">Order details</h3>
                <p>Choose the customer and starting fulfillment status.</p>
              </div>
            </header>
            <div className="order-details-grid">
              <label className="form-field">
                <span>Customer *</span>
                <select
                  value={userId}
                  onChange={(event) => {
                    setUserId(event.target.value)
                    setErrors((current) => ({ ...current, userId: '' }))
                  }}
                  aria-invalid={Boolean(errors.userId)}
                  aria-describedby={errors.userId ? 'builder-user-error' : undefined}
                >
                  <option value="">Select a customer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>#{user.id} · {user.fullName} ({user.email})</option>
                  ))}
                </select>
                {errors.userId ? <small className="field-error" id="builder-user-error">{errors.userId}</small> : null}
              </label>
              <label className="form-field">
                <span>Initial status *</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                </select>
                <small className="field-help">Status can be updated later from Orders.</small>
              </label>
            </div>
          </section>

          <section className="panel order-section" aria-labelledby="product-lines-title">
            <header className="section-heading product-lines-heading">
              <span className="section-icon"><PackagePlus size={19} aria-hidden="true" /></span>
              <div>
                <h3 id="product-lines-title">Product lines</h3>
                <p>Only active catalog products can be ordered.</p>
              </div>
              <button
                className="button secondary compact-button"
                type="button"
                onClick={addLine}
                disabled={products.length === 0 || lines.length >= 100}
              >
                <Plus size={16} aria-hidden="true" />
                Add line
              </button>
            </header>

            {errors.items ? <div className="inline-error" role="alert">{errors.items}</div> : null}
            <div className="order-lines">
              {lines.length === 0 ? (
                <div className="builder-empty">
                  <PackagePlus size={30} aria-hidden="true" />
                  <p>No products added yet.</p>
                  <button className="button secondary" type="button" onClick={addLine}>Add first product</button>
                </div>
              ) : lines.map((line, index) => {
                const product = productsById.get(Number(line.productId))
                const quantity = Number(line.quantity)
                const lineTotal = product && Number.isFinite(quantity) && quantity > 0
                  ? product.price * quantity
                  : 0
                const productErrorId = `line-${line.clientId}-product-error`
                const quantityErrorId = `line-${line.clientId}-quantity-error`
                return (
                  <fieldset className="order-line" key={line.clientId}>
                    <legend>Product line {index + 1}</legend>
                    <span className="line-number" aria-hidden="true">{index + 1}</span>
                    <label className="form-field product-select-field">
                      <span>Product *</span>
                      <select
                        value={line.productId}
                        onChange={(event) => updateLine(line.clientId, 'productId', event.target.value)}
                        aria-invalid={Boolean(errors[`line-${line.clientId}-productId`])}
                        aria-describedby={errors[`line-${line.clientId}-productId`] ? productErrorId : undefined}
                      >
                        <option value="">Select an active product</option>
                        {products.map((option) => (
                          <option
                            key={option.id}
                            value={option.id}
                            disabled={selectedProductIds.has(option.id) && Number(line.productId) !== option.id}
                          >
                            {option.name} · {option.merchantName} · {money.format(option.price)}
                          </option>
                        ))}
                      </select>
                      {errors[`line-${line.clientId}-productId`] ? (
                        <small className="field-error" id={productErrorId}>{errors[`line-${line.clientId}-productId`]}</small>
                      ) : null}
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
                        aria-invalid={Boolean(errors[`line-${line.clientId}-quantity`])}
                        aria-describedby={errors[`line-${line.clientId}-quantity`] ? quantityErrorId : undefined}
                      />
                      {errors[`line-${line.clientId}-quantity`] ? (
                        <small className="field-error" id={quantityErrorId}>{errors[`line-${line.clientId}-quantity`]}</small>
                      ) : null}
                    </label>
                    <div className="line-price">
                      <span>Unit price</span>
                      <strong>{product ? money.format(product.price) : '—'}</strong>
                    </div>
                    <div className="line-price line-total">
                      <span>Line total</span>
                      <strong>{money.format(lineTotal)}</strong>
                    </div>
                    <button
                      className="icon-button danger remove-line"
                      type="button"
                      onClick={() => removeLine(line.clientId)}
                      aria-label={`Remove product line ${index + 1}`}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </fieldset>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="order-summary panel" aria-labelledby="order-summary-title">
          <div className="summary-heading">
            <span className="summary-icon"><CircleDollarSign size={20} aria-hidden="true" /></span>
            <div>
              <h3 id="order-summary-title">Order summary</h3>
              <p>Live calculation</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Product lines</dt>
              <dd>{lines.length}</dd>
            </div>
            <div>
              <dt>Total units</dt>
              <dd>{integer.format(totals.units)}</dd>
            </div>
            <div className="summary-total">
              <dt>Subtotal</dt>
              <dd>{money.format(totals.subtotal)}</dd>
            </div>
          </dl>
          <p className="summary-note">The server verifies current prices and product availability before saving.</p>
          <button
            className="button primary submit-order"
            type="submit"
            disabled={submitting || products.length === 0}
          >
            <ShoppingCart size={17} aria-hidden="true" />
            {submitting ? 'Creating order…' : 'Create sales order'}
          </button>
        </aside>
      </form>
    </section>
  )
}
