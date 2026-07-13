import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ title, children, onClose }: ModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(
      'input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    ) ?? panel?.querySelector<HTMLElement>('button:not(:disabled), a[href]')
    firstFocusable?.focus()

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      previousFocus?.focus()
    }
  }, [])

  function keepFocusInside(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
    ))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInside}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
