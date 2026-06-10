// Подгружает кастомные jest-dom матчеры (toBeInTheDocument и т.п.).
require('@testing-library/jest-dom');

// jsdom не пробрасывает structuredClone в global — нужно для fake-indexeddb
// и любых тестов, оперирующих сложными объектами через IDB clone-семантику.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
