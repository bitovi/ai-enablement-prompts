import { InfoCard } from '../InfoCard'

type Status = 'success' | 'warning' | 'error'

interface CardListItem {
  id: string
  title: string
  description: string
  status: Status
}

interface CardListProps {
  items: CardListItem[]
}

export function CardList({ items }: CardListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <InfoCard
          key={item.id}
          title={item.title}
          description={item.description}
          status={item.status}
        />
      ))}
    </div>
  )
}
