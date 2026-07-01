import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  ignores: [
    '.webspatial/**',
    'misc/**',
    '**/dist/**',
    'backend/data/**',
    'backend/src/core/db/migrations/**',
    '**/*.md',
  ],
})
