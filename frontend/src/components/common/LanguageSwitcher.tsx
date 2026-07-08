import React from 'react';
import { useLang } from '../../context/LanguageContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { LANGUAGES, LangCode } from '../../i18n';
import { Globe } from 'lucide-react';

/** Compact language dropdown (globe + native names) for the top bar. */
const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useLang();
  const isMobile = useIsMobile();
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
          // Cap width so long native names never push the navbar into overlap.
          width: isMobile ? '92px' : 'auto',
          maxWidth: isMobile ? '92px' : '190px',
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
