# Допущения (ASSUMPTIONS)

Зафиксированные решения при отсутствии критичной информации.

| ID | Допущение | Обоснование |
|----|-----------|-------------|
| A01 | Этап 1 был клиентским; Этап 2 — server-authoritative, local save игнорируется | Переход по roadmap |
| A21 | Prisma 5.x (не 7) из-за Node 20 в среде | Совместимость runtime |
| A22 | Vite proxy `/api` → server; VITE_API_URL может быть пустым | Preview / same-origin |
| A23 | CORS в dev = allow all origins | E2B preview hosts |
| A24 | HE production хранит milli-remainder на Civilization | Integer resources без потери дробей |
| A25 | Poll state каждые 2с вместо клиентского tick | Server truth + simple UX |
| A02 | SQLite выбран для локального серверного MVP (Этап 2) | Простота, zero-ops |
| A03 | Zustand вместо Redux | Меньше boilerplate для game state |
| A04 | CSS Modules / обычный CSS на Этапе 1, Tailwind опционально позже | Контроль космического визуала без utility-шума |
| A05 | Тик = 1 секунда реального времени | Стандарт idle; легко считать offline |
| A06 | Offline cap (Этап 2) = 8 часов | Анти-эксплойт накопления |
| A07 | Имена великих структур/галактик — фиксированные пулы + seed index | Детерминизм + узнаваемость |
| A08 | Координаты — абстрактные единицы, 1 unit ≈ световые годы для UI | Не симулируем реальную астрофизику |
| A09 | Экспедиция Этапа 1: 3–5 секунд | Для быстрой проверки петли |
| A10 | Уровень цивилизации в UI не жёстко capped на 10, формула до 100, гейт ресурсов 60+ | Можно тестить прогрессию debug-ом |
| A11 | Probe Factory и Dark Sensor — UI + level up, полный эффект с Этапа 3–4 | Не scope-creep Этапа 1 |
| A12 | Антиматерия/ТЭ/ТМ отображаются с 0 и lock hint | Игрок видит мета-экономику сразу |
| A13 | Save version = 1; несовместимые смены — reset с предупреждением | Простота прототипа |
| A14 | Нет звука в Этапе 1 | Полировка Этапа 9 |
| A15 | Auth email/password классика на Этапе 2; OAuth не в MVP | Нет внешних API ключей |
| A16 | «Эфирные кредиты» как имя premium-валюты | Заглушка донатов |
| A17 | Один save slot на браузер (localStorage) | Multi-slot — после auth |
| A18 | Journal max 100 записей, старые вытесняются | Память UI |
| A19 | mulberry32 + xmur3 hash для RNG | Проверенный pair для seeded games |
| A20 | Русский UI copy захардкожен в компонентах; i18n later | Скорость Этапа 1 |
