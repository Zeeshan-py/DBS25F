import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const pageSize = 10

function isEmpty(value: Primitive | undefined) {
  return value === undefined || value === ''
}

export function EntityPage({ config }: EntityPageProps) {
  const [rows, setRows] = useState<ApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingRow, setEditingRow] = useState<ApiRecord | null>(null)
  const [formValues, setFormValues] = useState<ApiRecord>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [referenceOptions, setReferenceOptions] = useState<Record<string, SelectOption[]>>({})
  const [searchParams, setSearchParams] = useSearchParams()

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
    setNotice('')
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    let active = true
    const referenceFields = config.fields.filter((field) => field.reference)

    async function loadReferences() {
      try {
        const entries = await Promise.all(
          referenceFields.map(async (field) => {
            const source = field.reference!
            const records = await apiService.getAll(source.endpoint)
            const options = records.map((record) => ({
              value: record[source.valueKey],
              label: source.prefix
                ? `${source.prefix}${record[source.valueKey]} — ${record[source.labelKey]}`
                : String(record[source.labelKey]),
            }))
            return [field.key, options] as const
          }),
        )
        if (active) setReferenceOptions(Object.fromEntries(entries))
      } catch (error) {
        if (active) setLoadError(getErrorMessage(error))
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
    if (searchParams.get('create') === '1') {
      openCreate()
      setSearchParams({}, { replace: true })
    }
  }, [openCreate, searchParams, setSearchParams])

  const filteredRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [deferredSearch, rows])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [deferredSearch])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  function openEdit(row: ApiRecord) {
    setEditingRow(row)
    setFormValues(Object.fromEntries(config.fields.map((field) => [field.key, row[field.key] ?? ''])))
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
      .map((column) => row[column.key])
      .filter(Boolean)
      .join(' · ')
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
          <label className="search-field">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${config.plural.toLowerCase()}...`}
            />
          </label>
          <span>{filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}</span>
        </div>

        <div className="table-scroll">
          <table className="entity-table">
            <thead>
              <tr>
                {config.columns.map((column) => <th key={column.key}>{column.label}</th>)}
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
                visibleRows.map((row) => (
                  <tr key={config.getKeyPath(row)}>
                    {config.columns.map((column) => {
                      const value = row[column.key]
                      return (
                        <td key={column.key}>
                          {column.key === 'status'
                            ? <StatusBadge status={String(value)} />
                            : column.format
                              ? column.format(value, row)
                              : String(value)}
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
            Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="pagination">
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
                        disabled={disabled}
                        onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        aria-invalid={Boolean(formErrors[field.key])}
                      >
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {fieldOptions.map((option) => (
                          <option key={String(option.value)} value={option.value}>{option.label}</option>
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
                {submitting ? 'Saving…' : `Save ${config.singular.toLowerCase()}`}
              </button>
            </footer>
          </form>
        </Modal>
      ) : null}
    </section>
  )
}
