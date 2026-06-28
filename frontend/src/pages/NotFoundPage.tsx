import { ArrowLeft, Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="empty-page">
      <Boxes size={42} />
      <h2>Page not found</h2>
      <p>The requested module does not exist.</p>
      <Link className="button primary" to="/">
        <ArrowLeft size={17} />
        Return to dashboard
      </Link>
    </section>
  )
}
