import { Icon } from './ui.jsx';
import { useTheme } from '../hooks/useTheme.js';

/** Switches between the light and dark theme and remembers the choice. */
export default function ThemeToggle({ className = '', showLabel = false }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className={`btn secondary sm ${className}`} onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="icon-sm" />
      {showLabel && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
    </button>
  );
}
