export function normalizeCatalogSearch(value) {
  return value.normalize('NFC').toLocaleLowerCase('ru')
    .replace(/ё/g, 'е').trim().replace(/\s+/g, ' ');
}
