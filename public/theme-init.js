// Инициализация темы «Лунной ночи» до первой отрисовки (анти-FOUC).
// Ночь — по умолчанию (:root), light — opt-in через localStorage.
try {
  if (localStorage.getItem('emdr42-theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (e) {
  // localStorage недоступен (private mode) — остаёмся на ночной теме
}
