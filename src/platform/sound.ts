let generation = 0;
let context: AudioContext | undefined;
const active = new Set<OscillatorNode>();
let last = -Infinity;
export function stopSound() {
  generation++;
  for (const o of active) {
    try {
      o.stop();
    } catch {}
  }
  active.clear();
  if (context?.state === "running") void context.suspend().catch(() => {});
}
export type Sound = "select" | "input" | "note" | "erase" | "mode" | "win";
// Short, damped wooden/mallet tones; generated locally, no audio downloads.
export function playSound(kind: Sound) {
  if (document.hidden) return;
  const now = performance.now();
  if (kind !== "win" && now - last < 35) return;
  last = now;
  try {
    context ??= new AudioContext();
    const ctx = context,
      token = generation;
    void ctx
      .resume()
      .then(() => {
        if (document.hidden || token !== generation || active.size > 24) return;
        const notes =
          kind === "win"
            ? [523.25, 659.25, 783.99, 1046.5]
            : [
                kind === "mode"
                  ? 392
                  : kind === "note"
                    ? 880
                    : kind === "erase"
                      ? 294
                      : 587.33,
              ];
        const duration =
          kind === "win"
            ? 0.3
            : kind === "select"
              ? 0.035
              : kind === "note"
                ? 0.065
                : 0.1;
        notes.forEach((frequency, i) => {
          [1, 2.76].forEach((partial, j) => {
            const o = ctx.createOscillator(),
              gain = ctx.createGain(),
              start = ctx.currentTime + i * 0.085;
            o.type = "sine";
            o.frequency.setValueAtTime(frequency * partial * 1.04, start);
            o.frequency.exponentialRampToValueAtTime(
              frequency * partial,
              start + 0.025,
            );
            const level =
              (kind === "win" ? 0.045 : kind === "select" ? 0.012 : 0.035) *
              (j ? 0.14 : 1);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(level, start + 0.003);
            gain.gain.exponentialRampToValueAtTime(
              0.0001,
              start + duration / (j ? 2 : 1),
            );
            o.connect(gain);
            gain.connect(ctx.destination);
            active.add(o);
            o.onended = () => {
              active.delete(o);
              o.disconnect();
              gain.disconnect();
            };
            o.start(start);
            o.stop(start + duration);
          });
        });
      })
      .catch(() => {});
  } catch {
    /* Sound is optional; gameplay must remain available. */
  }
}
