# ADR-0003: Synthesised cockpit audio

## Status

Accepted, 2026-10-15; the owner approved the design the same day. Amends
ADR-0001 (Out of scope: audio).

## Context

ADR-0001 and the spec (§1, §4.9) put audio out of scope as avionics behaviour
that needs the outside world. That grouped two different things:

- Radio and intercom audio needs other stations and audio equipment the
  trainer does not model, and the intake leaves the intercom, the audio
  selector, the radio's audio and the GPS sounds and alarms out.
- The sounds of the cockpit itself (controls, engine, starter, airflow, flap
  motor, a unit's own start-up and key tones) follow from state the trainer
  already has.

The owner wants full cockpit audio (2026-10-15). Hearing the engine catch, the
rpm drop on one magneto circuit, an engine quit or the FLARM start-up beep is
part of recognising what the aircraft does, which is training realism
(ADR-0002 rank 2).

Constraints:

- G1: no manufacturer material in the repo, and a recording of a real engine
  or unit is third-party material.
- G2: the strict CSP allows no `blob:` or `data:` sources for media; the app
  is static and works offline.
- An aircraft is added by one package and one registry line (ADR-0001).
- The systems model has no engine or flight dynamics: rpm comes from a detent
  table and airspeed from the phase.
- Browsers start audio only after a user gesture.

## Decision

1. **Lift the audio non-goal for synthesised cockpit and device sounds:**
   control clicks, engine, propeller, starter, airflow, electric motors, and
   the start-up and key tones the intake records for a unit's own sounder.
   Radio reception and transmission, intercom, audio selector and GPS sounds
   and alarms stay out. FLARM traffic and obstacle tones stay out, since there
   is no traffic (owner, 2026-10-11).
2. **Every sound is synthesised in the browser** with native Web Audio nodes.
   No audio files, no recordings, no `AudioWorklet` in the first wave. Reason:
   G1 holds by construction and the owner chose synthesis over files; native
   nodes need no module of their own in the build or the precache, and a fake
   audio context can test them.
3. **Sounds are declared, not contained.** An aircraft or device declares its
   sounds as data and pure selectors (a voice id with options and inputs; a
   beep table and a pure cue diff; a control's own click or silence).
   Panel-kit implements each voice by id, as it implements widgets for
   ADR-0001 decision 4; `apps/web` owns the settings and connects a session to
   the audio. The new fields are optional, so the contract version stays.
4. **The pilot controls sound in the app frame:** an on/off toggle and a
   master volume, stored locally like the theme.
5. **Two waves.** The first uses only facts the intake already has; the second
   refines against facts an owner-run intake session adds.

Design: `docs/superpowers/specs/2026-10-15-cockpit-sounds-design.md`.

## Consequences

- An aircraft without sounds is silent apart from the shared control clicks;
  the demo aircraft stays so.
- Core gains a control-change feed and a reset epoch on the session; it stays
  free of audio APIs.
- Panel-kit gains audio (voices, clicks, beeps, the context lifecycle). An
  aircraft that needs a new voice adds it there, so `apps/web` still does not
  change when an aircraft is added.
- A control's sound comes from its kind unless the control names its own
  click or silence.
- Sound facts follow the rule for every aircraft fact: from the intake,
  paraphrased, with general knowledge marked assumed (unverified) beside its
  intake question.
- Audible behaviour follows the systems model: a unit beeps on its power-on
  path, not on page or phase load; audio plays only on the trainer screen.
- Automated tests cannot hear, so sound quality is judged in an owner
  listening check.
- A worklet voice later would ship as a built same-origin module under
  `script-src 'self'`, never as `blob:`.
