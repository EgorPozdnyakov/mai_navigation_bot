// =============================================================================
// dom.js — маленькие помощники для работы со страницей.
//
// Почему не innerHTML: данные приходят из таблицы, и если кто-то случайно
// впишет туда <script> или <b>, через innerHTML это стало бы частью страницы.
// el() кладёт текст через textContent — он всегда показывается как текст.
// =============================================================================

/**
 * Создаёт элемент страницы.
 *   el('p', { className: 'hint', text: 'Привет' })
 *   el('button', { attrs: { type: 'button', 'aria-label': 'Закрыть' }, onClick: close }, ['×'])
 * children — массив вложенных элементов или строк (null и false пропускаются,
 * это удобно для условий: [hasPhoto && photoElement]).
 */
export function el(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs || {})) {
    element.setAttribute(name, value);
  }
  if (options.onClick) element.addEventListener('click', options.onClick);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child);
  }
  return element;
}

/** Находит элемент по id. Если его нет — сразу понятная ошибка. */
export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`На странице нет элемента с id="${id}" (см. index.html)`);
  return element;
}

/**
 * Копирует текст в буфер обмена. Возвращает true, если получилось.
 * Сначала пробуем современный способ (navigator.clipboard), а если браузер
 * или Telegram его не дают — старый способ через временное текстовое поле.
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Не получилось — попробуем старый способ ниже.
  }
  const field = el('textarea', { attrs: { readonly: '', 'aria-hidden': 'true' } });
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }
  field.remove();
  return copied;
}
