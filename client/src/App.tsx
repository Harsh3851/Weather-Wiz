import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@/components/Layout';
import { usePreferences } from '@/hooks/usePreferences';
import { ResolvedThemeContext, useResolvedTheme } from '@/hooks/useTheme';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import { ComparePage } from '@/pages/ComparePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlacesPage } from '@/pages/PlacesPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="places" element={<PlacesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  const { preferences } = usePreferences();
  const theme = useResolvedTheme(preferences.theme);
  return (
    <ResolvedThemeContext.Provider value={theme}>
      {/* HashRouter keeps deep links working on GitHub Pages (no server rewrites). */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <Toaster theme={theme} position="bottom-right" richColors closeButton />
    </ResolvedThemeContext.Provider>
  );
}
