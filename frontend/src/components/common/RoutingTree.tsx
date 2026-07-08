import React from 'react';
import { Hierarchy } from '../../types';
import Avatar from './Avatar';
import { useLang } from '../../context/LanguageContext';
import { HardHat, ChevronDown, Info } from 'lucide-react';

// Official government emblems (bundled under /public/emblems).
const emblemBox = (src: string, alt: string) => (
  <div
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'white',
      border: '1px solid var(--border-card)',
      padding: 4,
      overflow: 'hidden',
    }}
  >
    <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
  </div>
);

interface RoutingTreeProps {
  hierarchy: Hierarchy | null;
  note?: string; // optional hint shown when tiers are missing
  /** When set, the MP tier becomes a button that opens that constituency. */
  onMpClick?: (constituencyId: number) => void;
}

const tierIconBox = (color: string, children: React.ReactNode) => (
  <div
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: color,
      color: 'white',
    }}
  >
    {children}
  </div>
);

const Connector: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
    <ChevronDown size={16} color="var(--text-muted)" />
  </div>
);

const Node: React.FC<{
  icon: React.ReactNode;
  tier: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, tier, primary, secondary, right, onClick }) => (
  <div
    className={onClick ? 'glass-panel glass-panel-hover' : 'glass-panel'}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: onClick ? 'pointer' : undefined }}
  >
    {icon}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '10.5px', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {tier}
      </div>
      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{primary}</div>
      {secondary && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{secondary}</div>}
    </div>
    {right}
  </div>
);

/** Vertical tree of who receives a request: MP → MLA → local civic body. */
const RoutingTree: React.FC<RoutingTreeProps> = ({ hierarchy, note, onMpClick }) => {
  const { t } = useLang();
  const parl = hierarchy?.parliamentary;
  const asm = hierarchy?.assembly;
  const civic = hierarchy?.civic?.officials?.[0];

  if (!parl && !asm) {
    return (
      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Info size={13} /> {note || t('tree.noInfo')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {parl && (
        <Node
          icon={emblemBox('/emblems/india.svg', 'Government of India')}
          tier={t('tree.mpTier')}
          primary={parl.mp ? parl.mp.name : parl.constituency.name}
          secondary={
            parl.mp
              ? `${parl.mp.party_abbr || parl.mp.party || ''} · ${parl.constituency.name}`
              : t('tree.mpFallback')
          }
          right={parl.mp ? <Avatar name={parl.mp.name} photoUrl={parl.mp.photo_url} size={38} /> : undefined}
          onClick={onMpClick && parl.mp ? () => onMpClick(parl.constituency.id) : undefined}
        />
      )}

      {asm && (
        <>
          {parl && <Connector />}
          <Node
            icon={emblemBox('/emblems/karnataka.svg', 'Government of Karnataka')}
            tier={t('tree.mlaTier')}
            primary={asm.mla ? asm.mla.name : t('tree.mlaUpdating')}
            secondary={`${asm.mla?.party_abbr || asm.mla?.party || ''}${asm.mla ? ' · ' : ''}${asm.assembly_constituency.name}`}
            right={asm.mla ? <Avatar name={asm.mla.name} photoUrl={asm.mla.photo_url} size={38} /> : undefined}
          />
        </>
      )}

      {civic && (
        <>
          <Connector />
          <Node
            icon={
              /bbmp|gba|bengaluru/i.test(civic.body)
                ? emblemBox('/emblems/bbmp.jpg', 'BBMP / GBA')
                : tierIconBox('var(--saffron)', <HardHat size={20} />)
            }
            tier={t('tree.localTier')}
            primary={civic.name || civic.role}
            secondary={`${civic.body}${civic.zone ? ' · ' + civic.zone : ''}${civic.name ? ' · ' + civic.role : ''}`}
          />
        </>
      )}

      {!asm && note && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
          <Info size={13} /> {note}
        </div>
      )}
    </div>
  );
};

export default RoutingTree;
