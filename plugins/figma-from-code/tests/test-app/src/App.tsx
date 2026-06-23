import { CardList } from './components/CardList'
import './index.css'

const sampleItems = [
  {
    id: '1',
    title: 'Database Migration',
    description: 'Schema updated to v2.4 with new indexes on user_sessions table.',
    status: 'success' as const,
  },
  {
    id: '2',
    title: 'API Rate Limiter',
    description: 'Approaching threshold — 82% of hourly quota consumed.',
    status: 'warning' as const,
  },
  {
    id: '3',
    title: 'Payment Gateway',
    description: 'Connection timeout after 3 retry attempts. Manual intervention required.',
    status: 'error' as const,
  },
]

export default function App() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">
        System Status
      </h1>
      <CardList items={sampleItems} />
    </main>
  )
}
