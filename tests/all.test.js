// Запуск проверок в Node.js: «node --test» в папке проекта. npm install не нужен.

import { test } from 'node:test';
import { cases } from './cases.js';

for (const [name, run] of cases) {
  test(name, run);
}
