# Audio: how the music works, and a brief for the composer

## The idea

The soundtrack plays continuously and changes with the night. Instead of switching between finished tracks, it's built from **stems**: loops that can be layered. Each time of day (a **scene**) turns on a set of stems. When the scene changes, stems shared by the old and new scene keep playing, and the rest fade in or out over a few bars. That's how a bassline from the 9pm track can carry into the 1am track.

Separately, **energy** stems (drums, hats) get louder as you walk toward hot events and quieter in empty parts of the city.

## Current scenes (New York time)

| Scene | Hours | Feel (suggestion) |
|---|---|---|
| daylight | 6am–5pm | airy, ambient, slow |
| dusk | 5pm–9pm | warm, anticipatory, first groove |
| prime | 9pm–1am | full groove, social |
| peak | 1am–4am | driving, darker, most energy |
| afterhours | 4am–6am | hazy, broken-down, comedown |

Try any scene with `?hour=N` in the URL (for example `?hour=2` for peak).

## Technical contract for stems

Everything is set in `apps/web/public/audio/manifest.json`.

- **Shared tempo and length.** Every stem uses the manifest's `bpm` (currently 118) and is exactly `loopBars` bars long (currently 8 bars of 4/4 = 16.27 s at 118 bpm). All stems start on the same clock tick and loop forever, so they stay in sync. If tempo has to change between scenes, we'll need a different design, so raise it early.
- **Compatible keys.** Any two stems that can be heard together, including during a 4-bar crossfade, should be harmonically compatible.
- **Seamless loops.** No click at the loop point, and no reverb tail that cuts off. Bake tails into the start of the loop.
- **Format.** 48 kHz stereo; deliver WAV masters, and we'll encode to OGG/AAC for the web. Peak around −6 dBFS per stem with no master limiting; mixing happens in the engine.
- **Roles.** `bed` stems play at full volume while their scene is on. `energy` stems are scaled by how close you are to hot events. Write energy stems so they sound right anywhere from 15% to 100% volume.
- **Scenes per stem.** Each stem lists the scenes it belongs to. Stems shared across scenes are the "pieces that carry through".

Example entry:

```json
{ "id": "bass", "role": "bed", "scenes": ["dusk", "prime", "peak"], "url": "/audio/bass.ogg" }
```

Until there are real files, `url: null` plus a `placeholder` makes the engine synthesize a simple pad, bass, kick or hat, so the system can be built and tested now.

## Where it's going
- Stems tied to genre near venues (a jazz layer near the Village Vanguard, techno near Nowadays), using the same energy mechanism.
- One-shot transition stingers when a scene changes.
- Spatial audio: event sounds panned toward where the venue is on screen.
- Possibly move to Tone.js or a small custom scheduler if we need quantized one-shots or tempo changes.
