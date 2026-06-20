---
name: Overlay z-index scale vs Leaflet
description: The fixed z-index layering RanchTrack overlays must follow so they stack above the Leaflet map.
---

# Overlay z-index scale

RanchTrack renders a Leaflet map (FieldsPage) whose controls/panes sit around `z-index: 1000`. Any app overlay that can appear over a page containing the map must exceed that, or it gets covered by map controls.

Established scale (low → high):

- Leaflet map controls/panes — ~1000 (library default)
- Mobile nav drawer wrapper (`Layout.tsx`) — `z-[1100]`
- Dialog + AlertDialog overlay/content (`ui/dialog.tsx`, `ui/alert-dialog.tsx`) — `z-[1200]`
- Select dropdown content (`ui/select.tsx`) — `z-[1300]` (must beat dialogs so dropdowns inside modals are usable)

**Why:** The default shadcn `z-50` values lose to Leaflet (~1000), so dialogs/drawers/selects appeared *behind* the map. Equal z-index is not safe either — DOM order can let the map win. Each tier must be strictly above the one below it.

**How to apply:** When adding any new floating/portal UI (popover, tooltip, toast, command menu), slot it into this scale relative to whatever it must cover. If it can overlap a Select, it needs > 1300. Never reintroduce `z-50` for app-level overlays.
