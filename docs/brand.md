---
version: alpha
name: Luna Mandala
type: brand
description: Centro terapéutico boutique. Marca cálida, contemporánea, con raíces espirituales discretas y ejecución profesional. La marca debe sentirse acogedora sin ser blanda, profesional sin ser corporativa. No usa jerga corporativa ni lenguaje espiritual genérico en UI.

colors:
  primary: "#583F8B"
  primary-strong: "#3F2E66"
  primary-soft: "#EFEAF7"
  accent-lime: "#CDD650"
  accent-lime-strong: "#A8B23F"
  accent-sky: "#77A6D8"
  accent-sky-strong: "#5A87B8"
  canvas: "#FDFDFF"
  ink: "#1A1525"
  ink-muted: "#5B556B"
  ink-subtle: "#9B96A8"
  hairline: "#E8E6EE"
  hairline-strong: "#D4D0DD"

semantic:
  success: "{colors.accent-lime}"
  info: "{colors.accent-sky}"
  warning: "#E0A64A"
  danger: "#C64A4A"
  on-primary: "#FFFFFF"
  on-success: "#1A1525"
  on-info: "#FFFFFF"

typography:
  wordmark:
    family: "Comfortaa, system-ui, sans-serif"
    weight: 700
    usage: "Wordmark 'Luna Mandala' y selección de display en booking público. Nunca en admin. Nunca en body."
  display-public:
    family: "Outfit, system-ui, sans-serif"
    weight: 700
    letterSpacing: "-0.02em"
    usage: "Hero headlines, h1, h2 grandes del booking público."
  body-public:
    family: "Outfit, system-ui, sans-serif"
    weight: 400
    usage: "Body, labels, descripciones del booking público."
  ui-public:
    family: "Outfit, system-ui, sans-serif"
    weight: 500
    usage: "Botones, chips, navegación del booking público."
  admin:
    family: "Inter, system-ui, sans-serif"
    usage: "Admin: el sistema tipográfico completo de Cal.com se aplica. Inter (regular/medium/semibold/bold) es workhorse. Cal Sans solo si se carga el typeface, si no, Inter Bold con letterSpacing -0.02em sustituye."

logo:
  file: "docs/brand/luna-mandala-logo.svg"
  variations:
    full-color: "Default. Sobre canvas claro."
    monochrome-primary: "Solo {colors.primary} sobre canvas claro."
    monochrome-on-dark: "Solo blanco sobre fondos oscuros o fotografía."
  minSize:
    wordmark-only: 24px
    logo-with-wordmark: 80px
  clearSpace: "Mínimo 1x la altura del wordmark a cada lado."
  prohibited:
    - "Modificar los colores del logo."
    - "Rotar, inclinar o estirar."
    - "Aplicar sombras, glows, gradientes o filtros."
    - "Usar sobre fondos con patrón o fotografía sin garantizar contraste y clear space."
    - "Recortar el mandala lateral en favor del centro."

voice:
  tone: "Cercana, calmada, profesional. Sin exclamaciones. Sin emojis decorativos. Sin jerga corporativa. Sin lenguaje espiritual genérico (no 'energía', no 'vibración', no 'sanación' en UI funcional)."
  pronoun:
    public-booking: "tú (al cliente)"
    admin: "tú (al usuario operador), texto breve, descriptivo, sin pronombre cuando se puede omitir"
  examples:
    do:
      - "Tu cita está confirmada para el martes a las 10:00."
      - "Elige el horario que mejor te acomode."
      - "Cita creada. La tabla se actualizó."
    dont:
      - "¡Tu reserva está lista! ✨ Te esperamos con mucha energía."
      - "Cliquea aquí para iniciar tu journey de bienestar."
      - "Operación exitosa: el registro ha sido persistido satisfactoriamente."

usage-rules:
  - "Antes de cualquier tarea de UI, leer este archivo y el DESIGN.md de la app que se toca."
  - "Todo color, radio, espaciado y tipografía debe venir de un token definido."
  - "Si se necesita un valor que no existe, primero se agrega al token correspondiente (brand.md o DESIGN.md), después al componente."
  - "Componentes no inventan colores ni espaciados."
  - "El morado primary aparece en booking con presencia (CTAs, links, headers). En admin aparece de forma residual (focus ring, active nav, primary action only)."
  - "Lima y azul son acentos semánticos en admin (success, info). En booking pueden aparecer decorativamente con criterio."
  - "Comfortaa nunca aparece en admin."
