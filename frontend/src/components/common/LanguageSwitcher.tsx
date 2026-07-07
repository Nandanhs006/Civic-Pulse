import React from 'react';
import { useLang } from '../../context/LanguageContext';
import { LANGUAGES, LangCode } from '../../i18n';
import { Globe } from 'lucide-react';

/** Compact language dropdown (globe + native names) for the top bar. */
const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useLang();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Globe size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '9px', pointerEvents: 'none' }} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        className="glass-input"
        aria-label={t('lang.label')}
        title={t('lang.label')}
        style={{ paddingLeft: '28px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13px' }}
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
