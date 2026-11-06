// =============================================================================
// Запуск проверок в браузере (открывается из tests/tests.html).
// Здесь своя маленькая замена модуля assert из Node.js: три функции
// equal, deepEqual и ok — ровно те, которыми пользуются проверки.
// =============================================================================

import { hoursCases } from './hours.cases.js';
import { dataCases } from './data.cases.js';

/** Глубокое сравнение: числа, строки, массивы и обычные объекты. */
function isDeepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && isDeepEqual(a[key], b[key]));
}

function fail(actual, expected, message) {
  const details = `получили: ${JSON.stringify(actual)}\nожидали:  ${JSON.stringify(expected)}`;
  throw new Error(message ? `${message}\n${details}` : details);
}

const assert = {
  equal(actual, expected, message) {
    if (!Object.is(actual, expected)) fail(actual, expected, message);
  },
  deepEqual(actual, expected, message) {
    if (!isDeepEqual(actual, expected)) fail(actual, expected, message);
  },
  ok(value, message) {
    if (!value) throw new Error(message || 'ожидали истину');
  },
};

const env = {
  assert,
  // Пути в проверках указаны от папки проекта, а мы находимся в tests/.
  readTextFile: async (path) => {
    const response = await fetch(`../${path}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.text();
  },
};

async function runAll() {
  const list = document.getElementById('results');
  const summary = document.getElementById('summary');
  let failed = 0;
  const all = [...hoursCases, ...dataCases];

  for (const testCase of all) {
    const item = document.createElement('li');
    item.textContent = testCase.name;
    try {
      await testCase.run(env);
      item.className = 'pass';
    } catch (error) {
      failed++;
      item.className = 'fail-item';
      const details = document.createElement('pre');
      details.textContent = error.message;
      item.append(details);
    }
    list.append(item);
  }

  summary.textContent = failed === 0
    ? `Все проверки прошли: ${all.length} из ${all.length}`
    : `Не прошли: ${failed} из ${all.length}`;
  summary.classList.add(failed === 0 ? 'ok' : 'fail');
}

runAll();
