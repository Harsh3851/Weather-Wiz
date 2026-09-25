import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@weatherwiz/shared';
import { Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { README_URL } from '@/lib/config';

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  error,
  registration,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  hint?: string;
}) {
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        className={`input ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...registration}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col py-6 sm:py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}

function DemoButton() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      loading={loading}
      onClick={() => {
        setLoading(true);
        loginDemo()
          .then(() => {
            toast.success('Signed in to the demo account');
            navigate('/');
          })
          .catch((err: unknown) => toast.error(errorMessage(err)))
          .finally(() => setLoading(false));
      }}
    >
      <Sparkles className="h-4 w-4" aria-hidden /> Try the demo account
    </Button>
  );
}

function AccountsUnavailable() {
  return (
    <AuthShell
      title="Accounts need the backend"
      subtitle="This live demo is a static site."
      footer={
        <Link to="/" className="text-accent hover:underline">
          Back to the dashboard
        </Link>
      }
    >
      <p className="text-sm text-muted">
        On GitHub Pages, Weather Wiz runs in demo mode: it calls Open-Meteo directly and keeps your
        saved places, preferences and alert rules in this browser. Sign-in, the one-click demo
        account and cross-device sync are served by the Node.js + MongoDB API.
      </p>
      <a
        href={README_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg"
      >
        Run the full stack locally
      </a>
    </AuthShell>
  );
}

function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden>
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginPage() {
  const { accountsEnabled, status, login } = useAuth();
  const navigate = useNavigate();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  useEffect(() => {
    document.title = 'Sign in · Weather Wiz';
  }, []);

  if (!accountsEnabled) return <AccountsUnavailable />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate('/');
    } catch (err) {
      form.setError('root', { message: errorMessage(err) });
    }
  });

  return (
    <AuthShell
      title="Sign in"
      subtitle="Sync saved places, preferences and alerts."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
        <Field
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email}
          registration={form.register('email')}
        />
        <Field
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password}
          registration={form.register('password')}
        />
        {form.formState.errors.root && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          Sign in
        </Button>
      </form>
      <OrDivider />
      <DemoButton />
    </AuthShell>
  );
}

export function RegisterPage() {
  const { accountsEnabled, status, register: signUp } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  useEffect(() => {
    document.title = 'Create account · Weather Wiz';
  }, []);

  if (!accountsEnabled) return <AccountsUnavailable />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp(values);
      toast.success('Account created');
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT')
        form.setError('email', { message: err.message });
      else form.setError('root', { message: errorMessage(err) });
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. No card, no spam."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
        <Field
          id="reg-name"
          label="Name"
          autoComplete="name"
          error={form.formState.errors.name}
          registration={form.register('name')}
        />
        <Field
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email}
          registration={form.register('email')}
        />
        <Field
          id="reg-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, including a letter and a number."
          error={form.formState.errors.password}
          registration={form.register('password')}
        />
        {form.formState.errors.root && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          Create account
        </Button>
      </form>
      <OrDivider />
      <DemoButton />
    </AuthShell>
  );
}
