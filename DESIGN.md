# PatchPath design system

## Direction

PatchPath is an engineering field notebook: calm editorial typography around a precise, interactive specimen. The interface should make the evidence easy to read before it asks for attention. A 3D view explains topology or physical structure; the page remains useful without it.

The visual references include Awwwards' *State of AI 2025* report, which combines data visualization with navigation, timeline, mobile, and on-scroll elements. We borrow the principle of giving complex information a readable sequence, not its exact colors, layout, or assets.

## Tokens

- Canvas: parchment `#F7F4EB`; alternate canvas: obsidian `#090B10`.
- Ink: `#141413`; secondary ink: `#5C5A54`.
- Fault: crimson `#D5484A`; caution: amber `#B9691B`.
- Validated path: emerald `#167A61`; selection: cobalt `#315DB6`.
- Display: Instrument Serif, with Georgia fallback.
- Interface: Plus Jakarta Sans, with system sans fallback.
- Telemetry: JetBrains Mono, with ui-monospace fallback.
- Surfaces use restrained borders and soft shadows. Glass blur is reserved for overlays, not every card.

## Hierarchy and layout

1. The title and active system establish context.
2. The viewport gets the largest surface area on desktop, but never contains the only explanation.
3. Evidence, assumptions, and recommendations use separate labels and typography.
4. Plan controls remain visible beside the result; primary action labels describe the action, not the effect.
5. At narrow widths, controls stack above the scene and the scene gets a fixed, usable height.

## Motion and accessibility

- Motion signals a change in system state and stops when the state is stable.
- Reduced-motion preference disables smooth scrolling, large transitions, and continuous scene movement.
- Every 3D interaction has a keyboard-accessible DOM equivalent.
- Color never carries fault or success meaning alone; labels and icons accompany it.
- The page has a static scene fallback, visible focus, semantic buttons, and readable 200% zoom behavior.

## Performance guardrails

- One R3F canvas per workbench.
- Procedural geometry only; repeated nodes are lightweight and capped.
- Canvas resolution is capped; no post-processing or external model downloads.
- Scene and motion fail gracefully when WebGL is unavailable or reduced motion is requested.
- No cursor-following motion that competes with camera controls.

