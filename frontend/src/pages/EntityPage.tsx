import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { apiService, getErrorMessage } from '../services/api'
import type {
  ApiRecord,
  EntityConfig,
  FormField,
  Primitive,
  SelectOption,
} from '../types/api'

interface EntityPageProps {
  config: EntityConfig
}

const pageSizeOptions = [10, 20, 50]

type SortDirection = 'asc' | 'desc'

interface SortState {
  key: string
  direction: SortDirection
}

function isEmpty(value: Primitive | undefined) {
  return value === undefined || value === ''
}

function readValue(row: ApiRecord, key: string): Primitive | undefined {
  if (row[key] !== undefined && row[key] !== null) return row[key]

  const normalizedKey = key.replaceAll('_', '').toLowerCase()
  const matchingKey = Object.keys(row).find(
    (candidate) => candidate.replaceAll('_', '').toLowerCase() === normalizedKey,
  )
  return matchingKey ? row[matchingKey] : undefined
}

function displayValue(value: Primitive | undefined) {
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

function compareValues(a: Primitive | undefined, b: Primitive | undefined, direction: SortDirection) {
  const modifier = direction === 'asc' ? 1 : -1
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1

  const aNumber = Number(a)
  const bNumber = Number(b)
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return (aNumber - bNumber) * modifier
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * modifier
}

function csvEscape(value: Primitive | undefined) {
  const text = displayValue(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function EntityPage({ config }: EntityPageProps) {
  const [rows, setRows] = useState<ApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [sortState, setSortState] = useState<SortState | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingRow, setEditingRow] = useState<ApiRecord | null>(null)
  const [formValues, setFormValues] = useState<ApiRecord>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [referenceOptions, setReferenceOptions] = useState<Record<string, SelectOption[]>>({})
  const [referenceLoading, setReferenceLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const loadRows = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setRows(await apiService.getAll(config.endpoint))
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [config.endpoint])

  useEffect(() => {
    setRows([])
    setSearch('')
    setPage(1)
    setStatusFilter('')
    setSortState(null)
    setNotice('')
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    let active = true
    const referenceFields = config.fields.filter((field) => field.reference)

    async function loadReferences() {
      setReferenceLoading(referenceFields.length > 0)
      try {
        const entries = await Promise.all(
          referenceFields.map(async (field) => {
            const source = field.reference!
            const records = await apiService.getAll(source.endpoint)
            const options = records.map((record) => ({
              value: record[source.valueKey],
              label: source.prefix
                ? `${source.prefix}${record[source.valueKey]} - ${record[source.labelKey]}`
                : String(record[source.labelKey]),
            }))
            return [field.key, options] as const
          }),
        )
        if (active) setReferenceOptions(Object.fromEntries(entries))
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error))
      } finally {
        if (active) setReferenceLoading(false)
      }
    }

    void loadReferences()
    return () => {
      active = false
    }
  }, [config.fields])

  const openCreate = useCallback(() => {
    const initial = Object.fromEntries(
      config.fields.map((field) => [field.key, field.options?.[0]?.value ?? '']),
    )
    setFormValues(initial)
    setFormErrors({})
    setEditingRow(null)
    setModalMode('create')
  }, [config.fields])

  useEffect(() => {
    const routeState = location.state as { openCreate?: number } | null
    if (config.path === 'orders' && routeState?.openCreate) {
      openCreate()
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [config.path, location.pathname, location.state, navigate, openCreate])

  const statusOptions = useMemo(
    () => config.fields.find((field) => field.key === 'status')?.options ?? [],
    [config.fields],
  )

  const filteredRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !term ||
        Object.values(row).some((value) => String(value).toLowerCase().includes(term))
      const matchesStatus = !statusFilter || readValue(row, 'status') === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [deferredSearch, rows, statusFilter])

  const sortedRows = useMemo(() => {
    if (!sortState) return filteredRows
    return [...filteredRows].sort((a, b) =>
      compareValues(readValue(a, sortState.key), readValue(b, sortState.key), sortState.direction),
    )
  }, [filteredRows, sortState])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, pageSize, statusFilter])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function openEdit(row: ApiRecord) {
    setEditingRow(row)
    setFormValues(Object.fromEntries(config.fields.map((field) => [field.key, readValue(row, field.key) ?? ''])))
    setFormErrors({})
    setModalMode('edit')
  }

  function closeModal() {
    if (submitting) return
    setModalMode(null)
    setEditingRow(null)
    setFormErrors({})
  }

  function optionsFor(field: FormField): SelectOption[] {
    return field.options ?? referenceOptions[field.key] ?? []
  }

  function toggleSort(key: string) {
    setSortState((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function exportCsv() {
    const header = config.columns.map((column) => csvEscape(column.label)).join(',')
    const body = sortedRows.map((row) =>
      config.columns.map((column) => csvEscape(readValue(row, column.key))).join(','),
    )
    const csv = [header, ...body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${config.path}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function validateForm() {
    const errors: Record<string, string> = {}
    for (const field of config.fields) {
      const value = formValues[field.key]
      if (field.required && isEmpty(value)) {
        errors[field.key] = `${field.label} is required.`
        continue
      }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        errors[field.key] = 'Enter a valid email address.'
      }
      if (field.type === 'number' && !isEmpty(value)) {
        const numeric = Number(value)
        if (!Number.isFinite(numeric)) errors[field.key] = 'Enter a valid number.'
        else if (field.min !== undefined && numeric < field.min) errors[field.key] = `Minimum value is ${field.min}.`
        else if (field.max !== undefined && numeric > field.max) errors[field.key] = `Maximum value is ${field.max}.`
      }
      if (field.type === 'date' && String(value) > new Date().toISOString().slice(0, 10)) {
        errors[field.key] = 'The date cannot be in the future.'
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function buildPayload(): ApiRecord {
    return Object.fromEntries(config.fields.map((field) => {
      const value = formValues[field.key]
      const availableOptions = optionsFor(field)
      const isNumericSelect = field.type === 'select' &&
        availableOptions.length > 0 &&
        typeof availableOptions[0].value === 'number'
      return [field.key, field.type === 'number' || isNumericSelect ? Number(value) : String(value).trim()]
    }))
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setFormErrors({})
    try {
      const payload = buildPayload()
      if (modalMode === 'edit' && editingRow) {
        await apiService.update(config.endpoint, config.getKeyPath(editingRow), payload)
        setNotice(`${config.singular} updated successfully.`)
      } else {
        await apiService.create(config.endpoint, payload)
        setNotice(`${config.singular} created successfully.`)
      }
      setModalMode(null)
      await loadRows()
    } catch (error) {
      setFormErrors({ form: getErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRow(row: ApiRecord) {
    const label = config.columns
      .slice(0, 2)
      .map((column) => readValue(row, column.key))
      .filter(Boolean)
      .join(' - ')
    if (!window.confirm(`Delete ${config.singular.toLowerCase()} ${label}? This action cannot be undone.`)) {
      return
    }

    setLoadError('')
    try {
      await apiService.remove(config.endpoint, config.getKeyPath(row))
      setNotice(`${config.singular} deleted successfully.`)
      await loadRows()
    } catch (error) {
      setLoadError(getErrorMessage(error))
    }
  }

  return (
    <section className="entity-page">
      <div className="page-intro">
        <div>
          <h2>{config.plural}</h2>
          <p>{config.description}</p>
        </div>
        <button className="button primary" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add {config.singular.toLowerCase()}
        </button>
      </div>

      {notice ? (
        <div className="alert success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      ) : null}
      {loadError ? <div className="alert error" role="alert">{loadError}</div> : null}

      <div className="data-panel">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <label className="search-field">
              <Search size={17} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${config.plural.toLowerCase()}...`}
              />
            </label>
            {statusOptions.length > 0 ? (
              <label className="compact-select">
                <Filter size={15} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {statusOptions.map((option) => (
                    <option key={String(option.value)} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="toolbar-actions">
            <span>{sortedRows.length} {sortedRows.length === 1 ? 'record' : 'records'}</span>
            <button className="button secondary compact-button" type="button" onClick={() => void loadRows()}>
              <RefreshCcw size={15} />
              Refresh
            </button>
            <button className="button secondary compact-button" type="button" onClick={exportCsv} disabled={sortedRows.length === 0}>
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="entity-table">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key}>
                    <button className="sort-button" type="button" onClick={() => toggleSort(column.key)}>
                      <span>{column.label}</span>
                      <ArrowUpDown size={13} />
                      {sortState?.key === column.key ? (
                        <span className="sort-direction">{sortState.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={config.columns.length + 1}>
                      <div className="skeleton skeleton-line" />
                    </td>
                  </tr>
                ))
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td className="empty-table" colSpan={config.columns.length + 1}>
                    No {config.plural.toLowerCase()} found.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIndex) => (
                  <tr key={`${config.path}-${config.getKeyPath(row)}-${rowIndex}`}>
                    {config.columns.map((column) => {
                      const value = readValue(row, column.key)
                      return (
                        <td key={column.key}>
                          {column.key === 'status'
                            ? value === undefined
                              ? '-'
                              : <StatusBadge status={String(value)} />
                            : column.format && value !== undefined
                              ? column.format(value, row)
                              : displayValue(value)}
                        </td>
                      )
                    })}
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => openEdit(row)} aria-label={`Edit ${config.singular}`}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => void deleteRow(row)} aria-label={`Delete ${config.singular}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="table-footer">
          <span>
            Showing {sortedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}
          </span>
          <div className="pagination">
            <label className="page-size">
              Rows
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button className="icon-button" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">
              <ChevronLeft size={17} />
            </button>
            <span>Page {page} of {pageCount}</span>
            <button className="icon-button" type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Next page">
              <ChevronRight size={17} />
            </button>
          </div>
        </footer>
      </div>

      {modalMode ? (
        <Modal title={`${modalMode === 'edit' ? 'Edit' : 'Add'} ${config.singular.toLowerCase()}`} onClose={closeModal}>
          <form className="entity-form" onSubmit={(event) => void submitForm(event)} noValidate>
            {formErrors.form ? <div className="alert error">{formErrors.form}</div> : null}
            <div className="form-grid">
              {config.fields.map((field) => {
                const fieldOptions = optionsFor(field)
                const disabled = modalMode === 'edit' && config.keyFields.includes(field.key)
                return (
                  <label className="form-field" key={field.key}>
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.key] ?? ''}
                        disabled={disabled || Boolean(field.reference && referenceLoading)}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        aria-invalid={Boolean(formErrors[field.key])}
                      >
                        <option value="">
                          {field.reference && referenceLoading
                            ? 'Loading options...'
                            : field.reference && fieldOptions.length === 0
                              ? 'No options available'
                              : `Select ${field.label.toLowerCase()}`}
                        </option>
                        {fieldOptions.map((option, optionIndex) => (
                          <option
                            key={`${field.key}-${String(option.value)}-${optionIndex}`}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formValues[field.key] ?? ''}
                        disabled={disabled}
                        min={field.min}
                        max={field.max}
                        placeholder={field.placeholder}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        aria-invalid={Boolean(formErrors[field.key])}
                      />
                    )}
                    {formErrors[field.key] ? <small className="field-error">{formErrors[field.key]}</small> : null}
                  </label>
                )
              })}
            </div>
            <footer className="modal-actions">
              <button className="button secondary" type="button" onClick={closeModal}>Cancel</button>
              <button className="button primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : `Save ${config.singular.toLowerCase()}`}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
