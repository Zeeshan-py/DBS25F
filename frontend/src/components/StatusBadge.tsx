interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-badge status-${normalized}`}>{status}</span>
}
