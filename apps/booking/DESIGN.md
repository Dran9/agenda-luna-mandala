---
version: alpha
name: Luna Mandala - Booking Público
scope: apps/booking/
brand-source: docs/brand.md
reference: Cal.com (docs/design-references/cal.DESIGN.md)
description: Superficie pública mobile-first donde el cliente del centro reserva su cita. Canvas casi blanco con CTAs en morado Luna Mandala, cards suaves con esquinas redondeadas (~12px), tipografía Outfit como workhorse y Comfortaa reservada al wordmark y algunos títulos hero. Sensación de spa boutique online — acogedor sin ser blando, profesional sin ser corporativo. Generoso whitespace, sin decoración innecesaria, sin lenguaje espiritual genérico en UI. La marca aparece con presencia.

colors:
  primary: "#583F8B"
  primary-active: "#3F2E66"
  primary-soft: "#EFEAF7"
  primary-disabled: "#E8E6EE"
  ink: "#1A1525"
  body: "#3B354A"
  muted: "#5B556B"
  muted-soft: "#9B96A8"
  hairline: "#E8E6EE"
  hairline-soft: "#F4F2F8"
  canvas: "#FDFDFF"
  surface-soft: "#F8F6FC"
  surface-card: "#F4F2F8"
  surface-strong: "#E8E6EE"
  surface-dark: "#1A1525"
  surface-dark-elevated: "#2A2438"
  on-primary: "#FFFFFF"
  on-dark: "#FDFDFF"
  on-dark-soft: "#B9B3C8"
  accent-lime: "#CDD650"
  accent-lime-soft: "#F0F2D6"
  accent-sky: "#77A6D8"
  accent-sky-soft: "#DCE7F4"
  success: "#CDD650"
  warning: "#E0A64A"
  error: "#C64A4A"
  on-success: "#1A1525"

typography:
  display-xl:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -2px
  display-lg:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.5px
  display-md:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -1px
  display-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.5px
  wordmark:
    fontFamily: "Comfortaa, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: 0
    usage: "Solo el wordmark 'Luna Mandala' y headlines hero seleccionados. Nunca para body."
  hero-script:
    fontFamily: "Comfortaa, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0
    usage: "Opcional para hero principal donde se quiere voz de marca cálida. Una vez por página máximo."
  title-lg:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.3px
  title-md:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  title-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  button:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
  nav-link:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
  section-mobile: 56px

shadows:
  card-rest: "0 1px 2px rgba(26, 21, 37, 0.04)"
  card-hover: "0 4px 12px rgba(88, 63, 139, 0.08)"
  focus-ring: "0 0 0 3px rgba(88, 63, 139, 0.25)"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "14px 22px"
    height: 44px
    transition: "background-color 150ms ease"
  button-primary-hover:
    backgroundColor: "{colors.primary-active}"
  button-primary-focus:
    boxShadow: "{shadows.focus-ring}"
    outline: none
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted-soft}"
    cursor: not-allowed
  button-secondary:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline-strong}"
    borderWidth: 1px
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 21px"
    height: 44px
  button-secondary-hover:
    backgroundColor: "{colors.surface-soft}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  link:
    color: "{colors.primary}"
    textDecoration: underline
    textUnderlineOffset: 3px
    textDecorationThickness: 1.5px
  input-text:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline-strong}"
    borderWidth: 1px
    textColor: "{colors.ink}"
    placeholderColor: "{colors.muted-soft}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    fontSize: 16px
    height: 44px
  input-text-focus:
    borderColor: "{colors.primary}"
    boxShadow: "{shadows.focus-ring}"
    outline: none
  input-error:
    borderColor: "{colors.error}"
  select:
    inherits: "input-text"
    paddingRight: 36px
  card:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline}"
    borderWidth: 1px
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    shadow: "{shadows.card-rest}"
  card-soft:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  chip:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    fontSize: 13px
    fontWeight: 500
  chip-success:
    backgroundColor: "{colors.accent-lime-soft}"
    textColor: "#5C6325"
  chip-info:
    backgroundColor: "{colors.accent-sky-soft}"
    textColor: "#2C5482"
  chip-primary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  navbar:
    height: 72px
    backgroundColor: "{colors.canvas}"
    borderBottom: "1px solid {colors.hairline}"
    paddingX: "{spacing.lg}"
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    paddingY: 64px
    paddingX: "{spacing.lg}"

principles:
  whitespace: "Generoso pero medido. Section padding 96px desktop / 56px mobile. Cada banda con un h1+h2+supporting, nunca listas densamente empacadas."
  hierarchy: "Una sola acción primaria por pantalla. CTAs secundarias siempre como botón secundario o ghost, nunca dos primarios al mismo nivel."
  brand-presence: "El morado primary aparece en CTA principal, links, focus rings, navegación activa. Comfortaa aparece máximo dos veces por página (wordmark + un hero opcional). Lima y azul aparecen como acentos puntuales — badges de disponibilidad, checks de confirmación, decoración mínima en pasos."
  decoration: "Permitida con criterio. Una ilustración simple, un patrón sutil del mandala lateral del logo, un acento de color en un divisor. Nunca tres decoraciones acumuladas. Nunca gradientes sobre fotos. Nunca shadows pesadas."
  motion: "Transiciones suaves de 150-250ms en hover/focus. Scroll-triggered fades sutiles permitidos. No carousels automáticos. No parallax. No micro-animaciones decorativas sin función."
  copy: "Cercano y claro. Sin exclamaciones. Sin emojis decorativos. Sin lenguaje espiritual genérico. Voz humana, no plantilla."
  images: "Fotografía con tono cálido y baja saturación. Personas reales en contexto del centro, no stock genérico de yoga. Mandala del logo y elementos derivados permitidos como decoración sutil. Nunca fotos con bordes redondeados extremos ni con shadows fuertes."
  accessibility:
    - "Contraste AA mínimo en todo texto."
    - "Hit targets de 44px mínimo en mobile."
    - "Focus ring visible siempre — boxShadow morado al 25%."
    - "Reduce-motion respetado: motion-safe en transiciones."

prohibited:
  - "Tailwind, shadcn, librerías de UI con su propio sistema."
  - "Cards dentro de cards."
  - "Más de un CTA primario por pantalla."
  - "Botones sin estado de focus visible."
  - "Lenguaje espiritual genérico ('energía', 'sanación', 'journey') en UI funcional."
  - "Emojis decorativos en texto de producto."
  - "Comfortaa para body text o controles UI."
  - "Outfit Light o Thin: el mínimo es 400 (regular)."
  - "Mezclar más de dos familias tipográficas en una pantalla."
  - "Gradientes en botones primarios. El morado es plano."
  - "Shadows mayores a las definidas en shadows tokens."

mobile:
  breakpoints:
    sm: 480px
    md: 768px
    lg: 1024px
    xl: 1280px
  rules:
    - "Mobile-first. Cada componente se diseña primero para 375px."
    - "Section padding cae a section-mobile (56px) bajo md."
    - "Display-xl no aparece bajo md: usar display-lg como máximo."
    - "Navbar collapse a hamburger bajo md."
    - "Form fields llenan ancho disponible bajo md."

dark-mode:
  status: "Tokens listos. Implementación opcional para v1 si no retrasa el booking funcional."
  strategy: "Invertir canvas/surface por surface-dark variants. Primary se mantiene #583F8B pero se ilumina a #7C5FB5 en superficie oscura. Texto invierte a on-dark."
