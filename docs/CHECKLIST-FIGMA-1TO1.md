# Checklist: 1:1 совпадение с Figma (UI страницы)

Цель: исключить расхождения в размерах/пропорциях/отступах между Figma и UI.

## 1) Синхронизация CSS
- [ ] Убедиться, что `ui-src/index.css` соответствует дизайн‑бандлу.
- [ ] После замены CSS вернуть наши кастомные стили в конец файла (например, `.pifwc-*`).
- [ ] Проверить, что используемые Tailwind‑классы реально присутствуют в `ui-src/index.css`.

**Быстрая проверка классов (Node):**
```bash
node - <<'NODE'
const fs = require('fs');
const upgradePath = './ui-src/components/UpgradeToPro.tsx';
const cssPath = './ui-src/index.css';
const upgrade = fs.readFileSync(upgradePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const classStrings = [];
const classNameRegex = /className=\"([^\"]+)\"/g;
const templateRegex = /className=\{`([^`]+)`\}/g;
let match;
while ((match = classNameRegex.exec(upgrade))) classStrings.push(match[1]);
while ((match = templateRegex.exec(upgrade))) classStrings.push(match[1]);
const classes = new Set();
classStrings.forEach((str) => str.split(/\s+/).filter(Boolean).forEach((cls) => classes.add(cls)));
const missing = [];
const esc = (cls) => '.' + cls
  .replace(/\\/g, '\\\\')
  .replace(/:/g, '\\:')
  .replace(/\//g, '\\/')
  .replace(/\[/g, '\\[')
  .replace(/\]/g, '\\]')
  .replace(/\./g, '\\.')
  .replace(/%/g, '\\%');
for (const cls of classes) {
  const needle = esc(cls);
  if (!css.includes(needle)) missing.push(cls);
}
missing.sort();
console.log('Missing:', missing.length);
missing.forEach((cls) => console.log(cls));
NODE
```

## 2) Проверка разметки
- [ ] Компонент страницы берём из дизайн‑бандла без «ручных» улучшений.
- [ ] Контейнер, сетки, карточки, градиенты — строго как в бандле.
- [ ] Проверить, что нет удалённых классов (`max-w-*`, `text-4xl`, `scale-105`, `space-y-2.5`, `min-h-[...]`).

## 3) Визуальная проверка
- [ ] Открыть страницу при масштабе 100%.
- [ ] Сверить отступы слева/справа и вертикальные интервалы между секциями.
- [ ] Проверить размеры карточек (особенно «5 Sites»), хедеры и размеры шрифтов.

## 4) Сборка
- [ ] `npm run build` после правок.
- [ ] В случае расхождений повторить шаги 1–3.

## 5) Локальные правила проекта
- [ ] Не добавлять промо‑блок в сайдбар (запрещено пользователем).
