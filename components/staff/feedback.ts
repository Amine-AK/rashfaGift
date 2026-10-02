"use client";

let ctx: AudioContext | null = null;

function beep(freq: number, ms: number, delay = 0) {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + ms / 1000 + 0.05);
  } catch {
    // Audio is a nice-to-have.
  }
}

/** Counter feedback: a bright two-note chime and a short buzz, or a low double tone. */
export function feedback(kind: "scan" | "success" | "error") {
  if (kind === "scan") {
    beep(1046, 90);
    navigator.vibrate?.(40);
  } else if (kind === "success") {
    beep(784, 120);
    beep(1175, 180, 0.12);
    navigator.vibrate?.(90);
  } else {
    beep(220, 160);
    beep(180, 220, 0.18);
    navigator.vibrate?.([70, 50, 70]);
  }
}
