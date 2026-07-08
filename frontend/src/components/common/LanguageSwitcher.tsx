import React from 'react';
import { useLang } from '../../context/LanguageContext';
import { LANGUAGES, LangCode } from '../../i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  /** Stretch to fill its container (used inside the mobile menu). */
  fullWidth?: boolean;
}

/** Compact language dropdown (globe + native names) for the top bar / menu. */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ fullWidth }) => {
  const { lang, setLang, t } = useLang();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0, width: fullWidth ? '100%' : 'auto' }}>
      <Globe size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', pointerEvents: 'none', zIndex: 1 }} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        className="glass-input"
        aria-label={t('lang.label')}
        title={t('lang.label')}
        style={{
          paddingLeft: '30px',
          paddingRight: '34px',
          fontSize: '13px',
          width: fullWidth ? '100%' : 'auto',
          maxWidth: fullWidth ? 'none' : '190px',
        }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
