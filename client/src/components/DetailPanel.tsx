import {
  BUILDINGS,
  buildingUpgradeCost,
  civilizationLevelCostHe,
  contactStatusLabelRu,
  FOCUS_KEYS,
  signalTypeLabelRu,
} from '@shared';
import type { AnomalyType, BuildingId, Habitability, ResourceId, StarType } from '@shared';
import { formatCoords, formatNumber } from '../lib/format';
import {
  ANOMALY_LABELS,
  BUILDING_LABELS,
  FOCUS_LABELS,
  HABITABILITY_LABELS,
  RESOURCE_LABELS,
  STAR_LABELS,
} from '../lib/labels';
import { useGameStore } from '../store/gameStore';
import styles from './DetailPanel.module.css';

export function DetailPanel() {
  const selected = useGameStore((s) => s.selected);
  const state = useGameStore((s) => s.state);
  const upgrade = useGameStore((s) => s.upgradeBuilding);
  const levelUp = useGameStore((s) => s.levelUp);
  const openDiplomacy = useGameStore((s) => s.openDiplomacy);
  const openCombat = useGameStore((s) => s.openCombat);
  const actionLoading = useGameStore((s) => s.actionLoading);

  if (!state) return null;
  const civ = state.civilization;
  const resources = state.resources;
  const hePerSec = state.production.highEnergyPerSec;

  if (!selected) {
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Инспектор</h2>
        <p className="muted">Выберите объект: ресурс, постройку, систему или планету.</p>
      </div>
    );
  }

  if (selected.kind === 'resource') {
    const id = selected.id as ResourceId;
    const meta = RESOURCE_LABELS[id];
    const val = resources[id];
    const cap = resources.capacities[id];
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Ресурс</h2>
        <h3 className={styles.name}>{meta.name}</h3>
        <p className={styles.desc}>{meta.desc}</p>
        <dl className={styles.dl}>
          <div>
            <dt>Запас</dt>
            <dd className="mono">
              {formatNumber(val)} / {formatNumber(cap, 0)}
            </dd>
          </div>
          {id === 'highEnergy' && (
<div>
            <dt>Производство</dt>
            <dd className="mono">{formatNumber(hePerSec)}/с</dd>
          </div>
          )}
          <div>
            <dt>Эфф. радар</dt>
            <dd className="mono">{state.effectiveRadar}</dd>
          </div>
          <div>
            <dt>Покупка</dt>
            <dd>
              {id === 'highEnergy' || id === 'fermions'
                ? 'Разрешена через Магазин (эфирные кредиты)'
                : 'Запрещена — только геймплей'}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'building') {
    const id = selected.id as BuildingId;
    const labels = BUILDING_LABELS[id];
    const def = BUILDINGS[id];
    const level = state.buildings.find((b) => b.type === id)?.level ?? 0;
    const cost = buildingUpgradeCost(id, level);
    const can = resources.highEnergy >= cost && civ.level >= def.unlockedAtLevel && !actionLoading;
    const sensorBonus = id === 'dark_sensor' ? level * 5 : null;

    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Постройка</h2>
        <h3 className={styles.name}>{labels.name}</h3>
        <p className={styles.desc}>{labels.desc}</p>
        <dl className={styles.dl}>
          <div>
            <dt>Уровень</dt>
            <dd className="mono">{level}</dd>
          </div>
          <div>
            <dt>Эффект</dt>
            <dd>{labels.effect}</dd>
          </div>
          {sensorBonus !== null && (
            <div>
              <dt>Бонус радара</dt>
              <dd className="mono">+{sensorBonus} (эфф. {state.effectiveRadar})</dd>
            </div>
          )}
          <div>
            <dt>Стоимость улучшения</dt>
            <dd className="mono">{formatNumber(cost, 0)} ВЭ</dd>
          </div>
          <div>
            <dt>Разблокировка</dt>
            <dd>Уровень цивилизации {def.unlockedAtLevel}+</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!can}
          onClick={() => void upgrade(id)}
        >
          Улучшить до {level + 1}
        </button>
      </div>
    );
  }

  if (selected.kind === 'civilization') {
    const nextCost = state.levelCosts?.highEnergy ?? civilizationLevelCostHe(civ.level);
    const nextDe = state.levelCosts?.darkEnergy ?? 0;
    const canLevel =
      resources.highEnergy >= nextCost &&
      (nextDe <= 0 || resources.darkEnergy >= nextDe) &&
      civ.level < 100 &&
      !actionLoading;
    const progress =
      nextCost > 0 ? Math.min(100, (resources.highEnergy / nextCost) * 100) : 100;

    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Цивилизация</h2>
        <h3 className={styles.name}>{civ.name}</h3>
        <p className={styles.desc}>
          Серверная сущность. Прогрессия 1–100; до 60 уровня — преимущественно высокие энергии.
        </p>
        <dl className={styles.dl}>
          <div>
            <dt>Уровень</dt>
            <dd className="mono">{civ.level} / 100</dd>
          </div>
          <div>
            <dt>Процветание</dt>
            <dd className="mono">{civ.prosperityScore}</dd>
          </div>
          <div>
            <dt>Seed</dt>
            <dd className="mono">{civ.seed}</dd>
          </div>
          <div>
            <dt>Раса</dt>
            <dd>{civ.speciesLabel ?? civ.species ?? '—'}</dd>
          </div>
          <div>
            <dt>Режим / правление</dt>
            <dd>
              {civ.politicalRegimeLabel ?? civ.politicalRegime ?? '—'} ·{' '}
              {civ.governmentFormLabel ?? civ.governmentForm ?? '—'}
            </dd>
          </div>
          <div>
            <dt>Население / колонии</dt>
            <dd className="mono">
              {civ.population ?? '—'} / {civ.colonies ?? 1}
            </dd>
          </div>
          <div>
            <dt>Стоимость ур. {civ.level + 1}</dt>
            <dd className="mono">
              {formatNumber(nextCost, 0)} ВЭ
              {nextDe > 0 ? ` + ${formatNumber(nextDe, 0)} ТЭ` : ''}
            </dd>
          </div>
          {civ.level < 60 && (
            <div>
              <dt>До ТЭ-эры</dt>
              <dd className="mono">{60 - civ.level} ур.</dd>
            </div>
          )}
          {civ.physicsLaws?.length > 0 && (
            <div>
              <dt>Законы физики</dt>
              <dd className="mono">{civ.physicsLaws.join(', ')}</dd>
            </div>
          )}
        </dl>
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            Прогресс до следующего уровня ({formatNumber(progress, 0)}%)
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <h4 className={styles.sub}>Константы</h4>
        <ul className={styles.focusList}>
          {FOCUS_KEYS.map((k) => (
            <li key={k}>
              {FOCUS_LABELS[k].name}: <span className="mono">{civ.constants[k]}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canLevel}
          onClick={() => void levelUp()}
        >
          Повысить уровень
        </button>
      </div>
    );
  }

  if (selected.kind === 'system') {
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Солнечная система</h2>
        <h3 className={styles.name}>{civ.systemName}</h3>
        <p className={styles.desc}>
          Процедурно сгенерирована на сервере. Параметры зафиксированы seed.
        </p>
        <dl className={styles.dl}>
          <div>
            <dt>Звезда</dt>
            <dd>{STAR_LABELS[civ.starType as StarType] ?? civ.starType}</dd>
          </div>
          <div>
            <dt>Координаты</dt>
            <dd className="mono">{formatCoords(civ.coordinates)}</dd>
          </div>
          <div>
            <dt>Аномалия</dt>
            <dd>{ANOMALY_LABELS[civ.anomalyType as AnomalyType] ?? civ.anomalyType}</dd>
          </div>
          <div>
            <dt>Радар/Локация</dt>
            <dd className="mono">{civ.radarQuality}</dd>
          </div>
          <div>
            <dt>Производство ВЭ</dt>
            <dd className="mono">{formatNumber(hePerSec)}/с</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'planet') {
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Планета</h2>
        <h3 className={styles.name}>{civ.mainPlanetName}</h3>
        <p className={styles.desc}>Основной мир цивилизации.</p>
        <dl className={styles.dl}>
          <div>
            <dt>Тип</dt>
            <dd>{civ.mainPlanetType}</dd>
          </div>
          <div>
            <dt>Пригодность</dt>
            <dd>{HABITABILITY_LABELS[civ.habitability as Habitability] ?? civ.habitability}</dd>
          </div>
          <div>
            <dt>Система</dt>
            <dd>{civ.systemName}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'great_structure') {
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Великая структура</h2>
        <h3 className={styles.name}>{civ.greatStructureName}</h3>
        <p className={styles.desc}>
          Крупномасштабная структура Вселенной в окрестности вашей галактики.
        </p>
        <dl className={styles.dl}>
          <div>
            <dt>Галактика</dt>
            <dd>{civ.galaxyName}</dd>
          </div>
          <div>
            <dt>Сектор</dt>
            <dd>{civ.sectorName}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'artifact') {
    const art = state.artifacts.find((a) => a.id === selected.id);
    if (!art) {
      return (
        <div className={`glass ${styles.panel}`}>
          <h2 className="panel-title">Артефакт</h2>
          <p className="muted">Объект не найден в хранилище.</p>
        </div>
      );
    }
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Артефакт</h2>
        <h3 className={styles.name}>{art.name}</h3>
        <p className={styles.desc}>{art.description}</p>
        <dl className={styles.dl}>
          <div>
            <dt>Редкость</dt>
            <dd>{art.rarity}</dd>
          </div>
          <div>
            <dt>Ключ</dt>
            <dd className="mono">{art.artifactKey}</dd>
          </div>
          <div>
            <dt>Эффекты</dt>
            <dd className="mono" style={{ fontSize: '0.75rem' }}>
              {JSON.stringify(art.effects)}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'anomaly') {
    const an = state.discoveredAnomalies.find((a) => a.id === selected.id);
    if (!an) {
      return (
        <div className={`glass ${styles.panel}`}>
          <h2 className="panel-title">Аномалия</h2>
          <p className="muted">Объект не найден.</p>
        </div>
      );
    }
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Обнаруженный объект</h2>
        <h3 className={styles.name}>{an.name}</h3>
        <p className={styles.desc}>{an.description}</p>
        <dl className={styles.dl}>
          <div>
            <dt>Тип</dt>
            <dd className="mono">{an.anomalyType}</dd>
          </div>
          <div>
            <dt>Сектор</dt>
            <dd className="mono">{an.sectorSeed}</dd>
          </div>
          <div>
            <dt>Эффекты</dt>
            <dd className="mono" style={{ fontSize: '0.75rem' }}>
              {JSON.stringify(an.effects)}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selected.kind === 'contact') {
    const c = state.contacts.find((x) => x.id === selected.id);
    if (!c) {
      return (
        <div className={`glass ${styles.panel}`}>
          <h2 className="panel-title">Контакт</h2>
          <p className="muted">Запись не найдена.</p>
        </div>
      );
    }
    const confPct = Math.round(c.confidence * 100);
    const canContact = c.status !== 'destroyed' && !actionLoading;
    return (
      <div className={`glass ${styles.panel}`}>
        <h2 className="panel-title">Контакт · Терра Инкогнита</h2>
        <h3 className={styles.name}>{c.displayName}</h3>
        <p className={styles.desc}>
          {c.fuzzy
            ? 'НЕТЧЁТКИЙ СИГНАЛ. Данные с высокой погрешностью.'
            : 'Каталогизированный источник организованной активности.'}
          {c.isRealPlayer ? ' Метка: возможный активный оператор.' : ''}
        </p>
        <dl className={styles.dl}>
          <div>
            <dt>Статус</dt>
            <dd>{contactStatusLabelRu(c.status)}</dd>
          </div>
          <div>
            <dt>Расстояние</dt>
            <dd className="mono">
              ~{formatNumber(c.distance, 0)} ± {formatNumber(c.distanceNoise, 0)} св. л.
            </dd>
          </div>
          <div>
            <dt>Уровень</dt>
            <dd className="mono">
              {c.levelMin}–{c.levelMax}
            </dd>
          </div>
          <div>
            <dt>Достоверность</dt>
            <dd className="mono">{confPct}%</dd>
          </div>
          <div>
            <dt>Тип сигнала</dt>
            <dd>{signalTypeLabelRu(c.signalType)}</dd>
          </div>
          <div>
            <dt>Координаты</dt>
            <dd className="mono">
              ({formatNumber(c.coordinates.x, 0)}, {formatNumber(c.coordinates.y, 0)},{' '}
              {formatNumber(c.coordinates.z, 0)})
            </dd>
          </div>
          <div>
            <dt>Галактика</dt>
            <dd>{c.galaxyName ?? 'неизвестно'}</dd>
          </div>
          <div>
            <dt>Сектор</dt>
            <dd>{c.sectorName ?? 'Терра Инкогнита'}</dd>
          </div>
          {c.threadId && (
            <>
              <div>
                <dt>Доверие</dt>
                <dd className="mono">{c.trust ?? '—'}</dd>
              </div>
              <div>
                <dt>Напряжение</dt>
                <dd className="mono">{c.tension ?? '—'}</dd>
              </div>
              <div>
                <dt>Канал</dt>
                <dd className="mono">{c.threadStatus ?? '—'}</dd>
              </div>
            </>
          )}
          {c.defenseStatus && (
            <div>
              <dt>Оборона</dt>
              <dd className="mono">{c.defenseStatus}</dd>
            </div>
          )}
          <div>
            <dt>Обнаружен</dt>
            <dd className="mono">{new Date(c.firstDetectedAt).toLocaleString('ru-RU')}</dd>
          </div>
        </dl>
        <div className={styles.actionsLocked}>
          <button type="button" className="btn btn-sm" disabled title="Скоро">
            Наблюдать
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={!canContact}
            title="Открыть дипломатический кабинет"
            onClick={() => void openDiplomacy(c.id)}
          >
            {c.threadId ? 'Открыть канал' : 'Установить контакт'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={!canContact || c.isDestroyed}
            title="Тактический кабинет"
            onClick={() => openCombat(c.id)}
          >
            Подготовить удар
          </button>
        </div>
        <p className={styles.warn}>
          Бой асинхронен: подготовка → транзит → отчёт. Тёмный удар необратим.
        </p>
      </div>
    );
  }

  return null;
}
