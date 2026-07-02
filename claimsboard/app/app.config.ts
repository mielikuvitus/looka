export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
    },
    // Editorial language: hairlines, not shadows; square, not rounded.
    // These strings are appended to the theme defaults and tailwind-merge
    // lets the last class win, so shadow-lg→shadow-none, rounded-*→rounded-none.
    modal: { slots: { content: 'rounded-none shadow-none' } },
    dropdownMenu: { slots: { content: 'rounded-none shadow-none' } },
    selectMenu: { slots: { content: 'rounded-none shadow-none' } },
    popover: { slots: { content: 'rounded-none shadow-none' } },
    tooltip: { slots: { content: 'rounded-none shadow-none' } },
    toast: { slots: { root: 'rounded-none shadow-none' } },
    skeleton: { base: 'rounded-none' },
  },
})
