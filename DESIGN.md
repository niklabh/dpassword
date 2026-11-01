# Design Brief

## Direction

Vault Noir — a dark-mode-first encrypted vault that feels like a precision instrument: quiet, tactile, and trustworthy.

## Tone

Refined industrial security: deep ink-indigo surfaces, warm brass accents, and zero decoration that does not earn its place.

## Differentiation

Brass-on-ink palette with monospaced secret fields makes every password and key feel physically locked in a vault.

## Color Palette

| Token      | OKLCH          | Role   |
| ---------- | -------------- | ------ |
| background | 0.155 0.022 275 | app canvas (dark) |
| foreground | 0.94 0.008 275  | primary text |
| card       | 0.195 0.024 275 | item cards, panels |
| primary    | 0.76 0.145 72   | brass accent, CTAs |
| accent     | 0.74 0.13 168   | mint verified/lock state |
| muted      | 0.235 0.024 275 | subtle surfaces |
| destructive | 0.62 0.2 22   | lock/delete actions |
| success    | 0.72 0.14 165  | unlocked/secure status |

## Typography

- Display: Space Grotesk — headings, app name, section titles
- Body: DM Sans — UI labels, list rows, paragraphs
- Mono: JetBrains Mono — passwords, keys, URLs, timeout counters
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Layered surfaces: background → card → popover, separated by hairline borders and two soft shadows (subtle, elevated); no glow, no neon.

## Structural Zones

| Zone    | Background       | Border        | Notes                          |
| ------- | ---------------- | ------------- | ------------------------------ |
| Header  | bg-card/80 glass | border-b      | vault status + lock button     |
| Sidebar | bg-sidebar       | border-r      | nav: Notes / Passwords, search |
| Content | bg-background    | —             | list + detail split pane       |
| Footer  | bg-muted/40      | border-t      | session timeout indicator      |

## Spacing & Rhythm

Spacious 1.5rem section gaps, 0.75rem list-row rhythm, tight 0.25rem micro-spacing inside fields; density rises in list views, relaxes in editors.

## Component Patterns

- Buttons: rounded-md, brass primary with subtle gradient, hover lifts via shadow-elevated
- Cards: rounded-lg, bg-card, border-border, shadow-subtle; selected row uses accent-left bar
- Badges: rounded-full pills for tags, muted bg with accent text for verified state

## Motion

- Entrance: 180ms fade-in-up for list rows and panels, staggered
- Hover: 150ms transition-smooth on buttons, rows, and nav items
- Decorative: slow pulse on the session-timeout ring as it nears expiry

## Constraints

- Dark-mode-first; light mode is a tuned secondary, never an inverted afterthought
- Semantic tokens only — no raw hex, rgb, or arbitrary color classes in components
- No password strength meter or breach checking (out of scope)
- No sharing, no Rust backend surfaces (out of scope)

## Signature Detail

The brass "vault dial" lock control with a mint pulse ring — a single memorable security affordance that ties the whole identity together.
