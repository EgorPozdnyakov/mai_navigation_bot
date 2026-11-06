// =============================================================================
// Запуск проверок в Node.js. Из папки проекта:
//     node --test
// Node.js сам найдёт файлы *.test.js. Интернет и npm install не нужны.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { hoursCases } from './hours.cases.js';
import { dataCases } from './data.cases.js';

// Папка проекта (на уровень выше папки tests).
const projectRoot = new URL('../', import.meta.url);

// Papa Parse — библиотека для браузера. В браузере она появляется как
// window.Papa после <script src="vendor/papaparse/papaparse.min.js">.
// Здесь выполняем тот же файл, и библиотека появляется как globalThis.Papa —
// ровно там, где её ищет js/data.js.
const papaCode = await readFile(new URL('vendor/papaparse/papaparse.min.js', projectRoot), 'utf8');
vm.runInThisContext(papaCode);

// То, что получают проверки: assert и чтение файлов проекта.
const env = {
  assert,
  readTextFile: (path) => readFile(new URL(path, projectRoot), 'utf8'),
};

for (const testCase of [...hoursCases, ...dataCases]) {
  test(testCase.name, () => testCase.run(env));
}
