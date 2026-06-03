const LIBRARY_PATTERNS = [
  /^_/,
  /^Suspense$/,
  /^Fragment$/,
  /^Provider$/,
  /^Consumer$/,
  /^Context$/,
  /^Outlet$/,
  /^Route$/,
  /^Router$/,
  /^Routes$/,
  /^BrowserRouter$/,
  /^MemoryRouter$/,
  /^QueryClientProvider$/,
  /^Hydrate$/,
  /^ThemeProvider$/,
  /^StrictMode$/,
  /^Profiler$/,
  /^ForwardRef$/,
  /^Memo$/,
  /^Lazy$/,
  /^ErrorBoundary$/,
  /^HelmetProvider$/,
  /^\$/,
  /^[a-z]/,
  /^(Presence|AnimatePresence|MotionComponent)$/,
  /^Primitive\./,
  /^(Slot|SlotClone|Primitive)$/,
  /^(Portal|Dismissable|FocusScope|DismissableLayer)$/,
  /^(Collection|ItemSlots)/,
  /^ReactQueryDevtools/,
  /^(Toaster|Sonner)$/,
];

function isLibraryComponent(name) {
  return LIBRARY_PATTERNS.some(p => p.test(name));
}

module.exports = { isLibraryComponent, LIBRARY_PATTERNS };
