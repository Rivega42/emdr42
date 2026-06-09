/** Conventional Commits (см. CLAUDE.md — git-воркфлоу). */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Русские описания в subject — норм для этого репо.
    'subject-case': [0],
    // Длинные subject с контекстом issue допустимы.
    'header-max-length': [2, 'always', 120],
  },
};
