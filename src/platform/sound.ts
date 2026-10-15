let generation = 0;
let context: AudioContext | undefined;
const active = new Set<OscillatorNode>();
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
export function playSound(kind: "input" | "mode" | "win") {
  try {
    context ??= new AudioContext();
    const ctx = context,
      token = generation;
    void ctx
      .resume()
      .then(() => {
        if (document.hidden || token !== generation) return;
        const notes =
          kind === "win" ? [523, 659, 784] : [kind === "mode" ? 440 : 660];
        notes.forEach((frequency, i) => {
          const oscillator = ctx.createOscillator(),
            gain = ctx.createGain(),
            start = ctx.currentTime + i * 0.11;
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.035, start + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          active.add(oscillator);
          oscillator.onended = () => {
            active.delete(oscillator);
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(start);
          oscillator.stop(start + 0.1);
        });
      })
      .catch(() => {});
  } catch {
    /* Audio is optional. */
  }
}
