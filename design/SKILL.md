---
name: emdr42-design
description: Use this skill to generate well-branded interfaces and assets for EMDR42 (EMDR-AI Therapy Assistant, emdr42.ru), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping in the «Лунная ночь» (Kuindzhi moonlit-night) art direction.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key rules that must never be broken:
- Audience is in a vulnerable state: the design must calm and build trust. No aggressive brightness, no marketing noise, no exclamation marks.
- Glow comes from contrast of dark surroundings, never from neon. Only the primary CTA (and progress indicators) may glow.
- Two themes with identical semantic tokens: «ночь» (default, deep green-blue #0A161D, moonlight accent #9FD8C0) and «рассвет» ([data-theme="light"], misty #F4F8F6, pine-green accent #1F5C4D).
- Spectral 500 for h1–h2 only; Onest for everything else; headings never 700+.
- Icons: Lucide, 1.5px stroke. Never emoji.
- The medical disclaimer (warm umber card) is mandatory on the landing page and must not be hidden.
- All light animations are disabled under prefers-reduced-motion. WCAG AA contrast in both themes; touch targets ≥ 44px.
