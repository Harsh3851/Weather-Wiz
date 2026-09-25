import { clsx } from 'clsx';
import {
  Columns2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Star,
  Sun,
  User,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { usePreferences } from '@/hooks/usePreferences';
import { useSelectPlace } from '@/hooks/useSelectPlace';
import { useRecentSearches } from '@/hooks/useUserCollections';
import { REPO_URL } from '@/lib/config';
import { DemoBanner } from './DemoBanner';
import { SearchBox } from './SearchBox';
import { Button } from './ui/Button';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/compare', label: 'Compare', icon: Columns2, end: false },
  { to: '/places', label: 'Places', icon: Star, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

function Logo() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-2 rounded-lg font-semibold tracking-tight"
      aria-label="Weather Wiz home"
    >
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
      <span className="hidden text-base sm:inline">Weather Wiz</span>
    </NavLink>
  );
}

function ThemeToggle() {
  const { preferences, update } = usePreferences();
  const order = ['system', 'light', 'dark'] as const;
  const next = order[(order.indexOf(preferences.theme) + 1) % order.length]!;
  const Icon = preferences.theme === 'dark' ? Moon : preferences.theme === 'light' ? Sun : Monitor;
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => update({ theme: next })}
      aria-label={`Theme: ${preferences.theme}. Switch to ${next}`}
      title={`Theme: ${preferences.theme}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  );
}

function UnitToggle() {
  const { preferences, update } = usePreferences();
  const f = preferences.temperatureUnit === 'fahrenheit';
  return (
    <Button
      size="sm"
      variant="secondary"
      className="h-9 min-w-[3.25rem] font-semibold tabular"
      onClick={() => update({ temperatureUnit: f ? 'celsius' : 'fahrenheit' })}
      aria-label={`Temperature unit: ${f ? 'Fahrenheit' : 'Celsius'}. Switch to ${f ? 'Celsius' : 'Fahrenheit'}`}
    >
      °{f ? 'F' : 'C'}
    </Button>
  );
}

function AccountButton() {
  const { accountsEnabled, status, user, logout } = useAuth();
  const navigate = useNavigate();
  if (!accountsEnabled) return null;
  if (status === 'loading') return <div className="skeleton h-9 w-20 rounded-xl" aria-hidden />;
  if (!user) {
    return (
      <Button size="sm" variant="primary" className="h-9" onClick={() => navigate('/login')}>
        <LogIn className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span
        className="hidden items-center gap-1.5 rounded-xl px-2 text-sm text-muted md:flex"
        title={user.email}
      >
        <User className="h-4 w-4" aria-hidden />
        <span className="max-w-[9rem] truncate">{user.name}</span>
      </span>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Sign out"
        title="Sign out"
        onClick={() =>
          void logout().then(() => {
            toast.success('Signed out');
            navigate('/');
          })
        }
      >
        <LogOut className="h-[18px] w-[18px]" />
      </Button>
    </div>
  );
}

export function Layout() {
  const selectPlace = useSelectPlace();
  const { recents } = useRecentSearches();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <Logo />
          <SearchBox
            className="order-last w-full md:order-none md:ml-4 md:w-auto md:max-w-md md:flex-1"
            onSelect={(p) => selectPlace(p)}
            recents={recents}
            inputId="global-search"
          />
          <div className="ml-auto flex items-center gap-1.5">
            <UnitToggle />
            <ThemeToggle />
            <AccountButton />
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-7xl px-2 sm:px-4">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-accent text-fg'
                        : 'border-transparent text-muted hover:text-fg',
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Weather data by{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Open-Meteo.com
            </a>{' '}
            under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              CC BY 4.0
            </a>
            .
          </p>
          <p>
            Built by Harsh Shukla ·{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
