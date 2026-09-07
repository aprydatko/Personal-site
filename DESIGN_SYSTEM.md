# AP Site design system

The portfolio uses an editorial layout with technical details: generous whitespace, large Manrope headings, small JetBrains Mono metadata, forest-green actions and quiet geometric patterns.

## Foundations

- Source of truth: `app/globals.css`. Use semantic tokens (`background`, `foreground`, `surface`, `border-subtle`, `muted`, `primary`) rather than page-specific colors. Dark mode uses the same tokens through `data-theme`.
- Main canvas: #fafaf9; ink: #181b1a; accent: #28725d. The dark accent is #84cbb0.
- Containers: `Container`, maximum 1280px including responsive 20/32/48px gutters.
- Headings: Manrope, tight tracking, balanced wrapping. Use `display-title` for the home hero and `page-title` for page introductions. Body: 16px, relaxed line-height. Mono is for dates, categories, technology names and code.
- Rhythm: 4/8px increments; `section-space` scales between 48px and 88px. Small controls have at least 44px touch targets. Form input text is 16px to avoid mobile browser zoom.
- Surfaces: thin borders, 8px media corners and 12px form corners. Reserve shadows for media/code windows.

## Components and interaction

- `Button`: primary, outline and ghost variants. Internal navigation uses Next Link. Loading/disabled controls stay visibly distinct.
- `PageIntro`: shared page heading and description. Projects use a structural grid; writing uses dotted notes. The home pattern responds to the pointer; contact uses a connection line.
- Featured work and article previews read the same Markdown content as their directory pages. Do not create a second home-page content list.
- Entire project previews and article rows link to their detail route. Search filters immediately. Pagination is shown only when there are more results.
- Contact drafts are addressed to the shared `contactEmail`. The form prepares a local draft, then the visitor chooses to open an email app or copy it. It does not deliver or persist messages. A future delivery service must return real success before showing a sent state.
- Missing social profiles are omitted. The CV action requests a CV by email until an actual document is supplied.

## Motion and accessibility

GSAP is loaded lazily. HomeMotion coordinates the opening reveal and pattern parallax. PageMotion handles inner-page reveals and reading progress. Both use matchMedia and clean up on unmount; reduced-motion users get static content. Content remains available if motion cannot load. Avoid perpetual decorative animation and scroll hijacking.

Keep visible focus rings, semantic landmarks, unique heading IDs, descriptive links, keyboard-operable menus, and local scrolling for long code blocks. Test narrow screens starting at 320px, tablet at 768px, and desktop. Never hide overflow to mask a content layout bug.
