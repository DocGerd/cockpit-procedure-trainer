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
- [ ] `tools/device-entry.test.ts`: a row in `NATURAL_SCREEN`. The slot fit is checked per install in
      `apps/web/src/devices/slot-fit.test.tsx`; it needs no row.
- [ ] A unit whose real face has no square bezel: `face: 'own'` in the entry, with
      `labelAt`, `pk-glass`, `FaceKey` and `KnobHelpers` ("A device that draws its own
      face" in the doc).
- [ ] Package `README.md` sections that `tools/device-readme.test.ts` checks.
- [ ] A changelog fragment, see the `changelog-fragment` skill.

Unregistering a package that stays in the repository: drop its registry, `unitNames`
and dependency rows and list its id in `UNREGISTERED` in `tools/device-entry.test.ts`
("Registering the device" in the doc). A dock must hold the widest installed floor
plus its Close button column ("Installing in an aircraft").

Nothing else in `apps/web` changes. Registry files are shared hot spots: serialise
them with other agents' device or aircraft PRs. Run the `CONTRIBUTING.md` Checks chain.
