import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  ignores: [
    '.webspatial/**',
    'misc/**',
    '**/dist/**',
    'backend/data/**',
    'backend/src/core/db/migrations/**',
    'claimsboard/.nuxt/**',
    'claimsboard/.output/**',
    'claimsboard/server/db/migrations/**',
    'claimsboard/data/**',
    'claimsboard/uploads/**',
    '**/*.md',
  ],
}, {
  // claimsboard is Vue/Nuxt — React hook heuristics misfire on composables
  files: ['claimsboard/**'],
  rules: {
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off',
  },
})
