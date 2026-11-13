# Styles

The flat parts of the site: the home page's still and the plain page now, the cards, timeline and trail map later. The 3D world is low-poly and flat-shaded and gets its colours from [`web/src/world/palette.ts`](../web/src/world/palette.ts).

## The look

A park brochure for one person. The NPS brochures' black title band carries the name across the top, and each place opens with a band in its own colour, taken from its environment. Everything else is quiet: paper, ink, one column, no cards.

## Tokens

[`web/src/styles/tokens.css`](../web/src/styles/tokens.css) is the one home of every colour, typeface, size and space. [`web/src/styles/page.css`](../web/src/styles/page.css) uses them by name, and maps each place to its colour (`.place-about-lake` paints with `--lake`).

| Role | Tokens |
|---|---|
| Paper and ink | `--paper`, `--ink`, `--ink-soft` |
| The title band | `--band`, `--band-ink` |
| One colour per place | `--meadow` (Trailhead), `--lake` (About Lake), `--granite` (The Stack), `--glacier` (Sideproject Spires) |
| Type | `--font` (National Park), `--weight-text`, `--weight-heavy`, `--text-small` up to `--text-h1`, `--leading`, `--measure` |
| Space | `--space-1` to `--space-4`, `--rule`, `--focus` |

Day is the only theme. Dusk arrives with its toggle (PRD requirement 12), and then every colour gets a Dusk value and its own contrast measurement.

## What the tests and the linter hold

- `tests/styles.test.ts` measures WCAG contrast for every text pair (ink, soft ink, a band's text, and each place's colour as a link on paper and as a band under white) and fails anything under 4.5:1. It also fails a colour spelled in any stylesheet or page but `tokens.css`, a font or size not taken from a token, and a typeface other than National Park.
- The linter's `trailhead/no-colour-literal` rule fails a colour literal in any `web/src` file but `world/palette.ts`.
- The browser suite runs axe at WCAG 2.2 AA on both pages at desktop and phone widths, checks nothing scrolls sideways at 360px, and checks the pages render in National Park.
- `--text-small` is the floor for text a reader reads; anything pressed, like a sign, is at least `--text-sign`.

## Copy

Third person, always: the site talks about TJ, never as him, and the content build refuses first-person words. Sentence case. Every new user-facing word needs TJ's approval before it ships. No email address anywhere.
