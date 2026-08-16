# Design — Shard Fusion Finder

A locked visual system for the full application. Every route uses the same late-90s / early-2000s Windows desktop language while choosing the Windows pattern that best fits its task.

## Genre

Product workbench with a bespoke Windows 98 / Windows 2000 / Windows XP shell.

## Macrostructure family

- App pages: Workbench. A desktop workspace contains one primary application window; dense controls and data stay inside that window.
- Scanner: Windows Explorer in Details view, with a summary pane and a Properties dialog for path inspection.
- Calculator: Control Panel task pane, with inventory inputs on the left and recommended operations on the right.
- Alerts: System Monitor / Event Viewer, with status summary and sortable rows.

## Theme

- Desktop: classic teal, used only outside application windows.
- Window surfaces: cool off-white and classic button grey.
- Active chrome: XP cobalt title bar and taskbar.
- Primary navigation: XP green Start button plus task buttons.
- Data states: dark green for profitable values, dark red for losses, and blue selection paired with text/icons so color is never the sole signal.

All concrete color values live in `tokens.css` and are expressed in OKLCH.

## Typography

- UI and display: Tahoma, then Segoe UI and system sans fallbacks.
- Data: Lucida Console, then system monospace fallbacks.
- Headings remain compact; this is an operating environment, not a marketing page.
- Numeric columns use tabular figures.

## Spacing

The existing four-point scale remains. Window chrome uses intentionally tighter spacing than content panes.

## Motion

- State feedback only: button press, Start menu open/close, native dialog open/close, and loading progress.
- No ornamental page entrances.
- Reduced motion collapses spatial transitions to instant state changes.

## Microinteractions stance

- Beveled buttons visibly press inward.
- Keyboard focus is immediate and uses a high-contrast focus treatment.
- Start menu closes when a destination is chosen.
- Native dialogs retain Escape, backdrop-click, and explicit-close behavior.

## What every route shares

- Taskbar, Start menu, system tray, window title bars, menu strips, beveled controls, fonts, spacing, and status-bar language.
- Route windows share the centered desktop inset used by the footer, while taskbar links provide persistent route switching.
- Primary navigation labels and route order.
- Data formatting and positive/negative semantics.

## What routes may vary

- Explorer, Control Panel, and System Monitor internal layouts.
- Toolbar contents and status-bar copy.
- Mobile collapses the desktop into a single maximized window while keeping the taskbar available.

## Exports

The canonical production export is the root `tokens.css` file. Tailwind, DTCG, and shadcn exports are intentionally omitted because those consumers are not configured in this project.
