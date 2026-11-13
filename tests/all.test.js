// Запуск проверок в Node.js: «node --test» в папке проекта. npm install не нужен.

import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Papa Parse — библиотека для браузера. Выполняем её файл, и появляется глобальный Papa,
// как после <script src="vendor/papaparse/papaparse.min.js"> на странице.
const root = new URL('../', import.meta.url);
vm.runInThisContext(await readFile(new URL('vendor/papaparse/papaparse.min.js', root), 'utf8'));

const { cases } = await import('./cases.js');
const read = (path) => readFile(new URL(path, root), 'utf8');

for (const [name, run] of cases) {
  test(name, () => run(read));
}
