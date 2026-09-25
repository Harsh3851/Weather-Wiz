import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'section' | 'div' | 'article';
}

export function Card({
  title,
  subtitle,
  action,
  as: Tag = 'section',
  className,
  children,
  ...rest
}: CardProps) {
  const headingId =
    typeof title === 'string'
      ? `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : undefined;
  return (
    <Tag className={clsx('card p-4 sm:p-5', className)} aria-labelledby={headingId} {...rest}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="card-title">
                {title}
              </h2>
            )}
            {subtitle && <p className="card-subtitle mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}
