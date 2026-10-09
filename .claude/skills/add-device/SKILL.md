---
name: add-device
description: Add an avionics device package (packages/device-<id>) to the cockpit trainer. Use when a task adds a device or changes how one is registered.
---

# Add a device

`docs/adding-a-device.md` is the source of truth for layout, logic, screen,
display, readout, floor and tests; read it and `docs/content-policy.md` first.
This skill only lists the touch points so none is missed.

Touch points, each detailed in that doc:

- [ ] `packages/device-<id>/` as in "Package layout", copied from the nearest
      sibling (`packages/device-com`, `packages/device-transponder`).
- [ ] `apps/web/package.json`: the `@cpt/device-<id>` `workspace:*` dependency;
      then `pnpm install` for the lockfile.
- [ ] `apps/web/src/device-registry.ts`: add the logic to `deviceRegistry` and
      `<id>ScreenEntry` to `deviceEntries`. Never edit `deviceScreens`, it is derived.
- [ ] `apps/web/src/devices/messages.ts`: the unit name in both languages in `unitNames`.
- [ ] `tools/device-entry.test.ts`: a row in `NATURAL_SCREEN` and one in `SLOT_OF`.
- [ ] Package `README.md` sections that `tools/device-readme.test.ts` checks.
- [ ] A changelog fragment, see the `changelog-fragment` skill.

Nothing else in `apps/web` changes. Registry files are shared hot spots: serialise
them with other agents' device or aircraft PRs. Run the `CONTRIBUTING.md` Checks chain.
