import { ThemeSwitcher } from '../../common/components/theme-switcher.component';
import { selectCurrentUser } from '../../user-management/selectors/user-authentication-status.selector';
import { useAppSelector } from '../hooks/use-app-selector';

export const HomeScreen = () => {
  const user = useAppSelector(selectCurrentUser);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Theme Switcher Demo */}
        <div className="flex justify-end">
          <ThemeSwitcher variant="buttons" showLabels />
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          <div className="flex items-center gap-4 mb-6">
            <img src="/images/logo.svg" alt="Logo" className="h-12 w-12" />
            <h1 className="text-4xl font-bold text-foreground">Home Screen</h1>
          </div>
          {user && (
            <p className="text-xl text-foreground">
              Welcome, <span className="font-semibold text-brand-600">{user.name}</span>!
            </p>
          )}
          <p className="mt-4 text-muted-foreground">
            This is your starter application home screen. Customize it to fit your needs.
          </p>

          {/* Theme Demo Section */}
          <div className="mt-8 p-6 bg-muted rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">Theme System Demo</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The theme switcher above demonstrates the built-in theme system. Try switching between light, dark, and
              system modes to see the colors update automatically.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-12 rounded bg-brand-500" />
                <p className="text-xs text-muted-foreground">Brand</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-primary-500" />
                <p className="text-xs text-muted-foreground">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-secondary-500" />
                <p className="text-xs text-muted-foreground">Secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-12 rounded bg-muted border border-border" />
                <p className="text-xs text-muted-foreground">Muted</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
