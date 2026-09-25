import { CloudOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg">
      <EmptyState
        icon={<CloudOff className="h-6 w-6" />}
        title="Page not found"
        action={
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Go to the dashboard
          </Link>
        }
      >
        The page you are looking for does not exist.
      </EmptyState>
    </div>
  );
}
