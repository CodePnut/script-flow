import { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <Card
      data-testid="feature-card"
      className={cn(
        'group transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 border-accent/20',
        className,
      )}
    >
      <CardHeader className="pb-4">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
          {icon}
        </div>
        <CardTitle className="text-xl font-semibold text-fg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base text-fg/70 leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
