import { useGameStore } from '../store/gameStore';
import styles from './ArtifactsPanel.module.css';

const RARITY_CLASS: Record<string, string> = {
  common: styles.common,
  rare: styles.rare,
  legendary: styles.legendary,
  mythic: styles.mythic,
};

const RARITY_RU: Record<string, string> = {
  common: 'Обычный',
  rare: 'Редкий',
  legendary: 'Легендарный',
  mythic: 'Мистический',
};

function effectLines(effects: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const pct = (v: unknown) => `${Math.round(Number(v) * 100)}%`;
  if (effects.heProductionBonus) lines.push(`+${pct(effects.heProductionBonus)} производство ВЭ`);
  if (effects.antimatterProductionBonus)
    lines.push(`+${pct(effects.antimatterProductionBonus)} антиматерия`);
  if (effects.darkMatterProductionBonus)
    lines.push(`+${pct(effects.darkMatterProductionBonus)} тёмная материя`);
  if (effects.darkEnergyProductionBonus)
    lines.push(`+${pct(effects.darkEnergyProductionBonus)} тёмная энергия`);
  if (effects.fermionsProductionBonus)
    lines.push(`+${pct(effects.fermionsProductionBonus)} фермионы`);
  if (effects.allProductionBonus) lines.push(`+${pct(effects.allProductionBonus)} всё производство`);
  if (effects.radarBonus) lines.push(`+${effects.radarBonus} радар`);
  if (effects.localScanCostReduction)
    lines.push(`−${pct(effects.localScanCostReduction)} стоимость локального скана`);
  if (effects.probeDurationReduction)
    lines.push(`−${pct(effects.probeDurationReduction)} длительность зондов`);
  if (effects.allExpeditionDurationReduction)
    lines.push(`−${pct(effects.allExpeditionDurationReduction)} длительность экспедиций`);
  if (effects.unlock4DRift) lines.push('Доступ к 4D-разлому');
  if (effects.expeditionReroll) lines.push('Переигровка экспедиции (24ч)');
  if (effects.levelUpEcho) lines.push('Эхо при level-up');
  if (effects.revealSectors) lines.push(`Открывает секторов: ${effects.revealSectors}`);
  return lines;
}

export function ArtifactsPanel() {
  const artifacts = useGameStore((s) => s.state?.artifacts ?? []);
  const select = useGameStore((s) => s.select);
  const selected = useGameStore((s) => s.selected);

  return (
    <div className={`glass ${styles.panel}`}>
      <h2 className="panel-title">Артефакты ({artifacts.length}/20)</h2>
      {artifacts.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          Хранилище пусто. Артефакты находят в экспедициях.
        </p>
      ) : (
        <div className={`scroll-y ${styles.list}`}>
          {artifacts.map((a) => {
            const isSel = selected?.kind === 'artifact' && selected.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.item} clickable ${isSel ? 'selected' : ''} ${RARITY_CLASS[a.rarity] ?? ''}`}
                onClick={() => select({ kind: 'artifact', id: a.id })}
              >
                <div className={styles.name}>
                  {a.name}
                  <span className={styles.badge}>{RARITY_RU[a.rarity] ?? a.rarity}</span>
                </div>
                <div className={styles.effects}>
                  {effectLines(a.effects).slice(0, 2).join(' · ') || a.description}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
