import { Monitor, Moon, Sun } from 'lucide-react';
import { FC } from 'react';

import type { ThemeMode } from '../../main/slices/theme-slice/theme.slice.types';
import { useTheme } from '../hooks/use-theme.hook';

interface ThemeSwitcherProps {
  /** Show labels next to icons */
  showLabels?: boolean;
  /** Variant style */
  variant?: 'buttons' | 'dropdown';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Theme switcher component with multiple display options
 *
 * @example
 * ```tsx
 * // Simple button group
 * <ThemeSwitcher variant="buttons" />
 *
 * // With labels
 * <ThemeSwitcher variant="buttons" showLabels />
 * ```
 */
export const ThemeSwitcher: FC<ThemeSwitcherProps> = ({ showLabels = false, variant = 'buttons', className = '' }) => {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeMode)}
          className="appearance-none bg-card text-foreground border border-border rounded-lg px-4 py-2 pr-8 cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          aria-label="Select theme"
        >
          {themes.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex rounded-lg border border-border bg-card p-1 ${className}`} role="group">
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
              ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
            aria-label={`Switch to ${label} theme`}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
