// Sound effects, synthesized with Web Audio so the site needs no audio files.
// Sound stays off until the visitor turns it on with the tray's speaker
// button; browsers only allow audio after a click or key press anyway.

let soundOn = false;
let audio: AudioContext | null = null;
let bus: GainNode;
let lastBlip = 0;

export function isSoundOn() {
  return soundOn;
}

export function setSoundOn(on: boolean) {
  soundOn = on;
}

function audioOut() {
  if (!audio) {
    audio = new AudioContext();
    bus = audio.createGain();
    bus.gain.value = 0.6;
    bus.connect(audio.destination);
    // A short, darkened echo gives every sound a glassy tail.
    const send = audio.createGain();
    const echo = audio.createDelay();
    const tone = audio.createBiquadFilter();
    const feedback = audio.createGain();
    send.gain.value = 0.35;
    echo.delayTime.value = 0.11;
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    feedback.gain.value = 0.3;
    bus.connect(send);
    send.connect(echo);
    echo.connect(tone);
    tone.connect(feedback);
    feedback.connect(echo);
    tone.connect(audio.destination);
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}

// One enveloped oscillator gliding from f0 to f1 Hz.
function note(
  f0: number,
  f1: number,
  dur: number,
  vol: number,
  delay = 0,
  type: OscillatorType = "sine",
) {
  const a = audioOut();
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env);
  env.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// White noise through a rising band-pass filter.
function whoosh() {
  const a = audioOut();
  const t = a.currentTime;
  const len = 0.45;
  const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const band = a.createBiquadFilter();
  const env = a.createGain();
  src.buffer = buf;
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(350, t);
  band.frequency.exponentialRampToValueAtTime(2600, t + len);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
  env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(band);
  band.connect(env);
  env.connect(bus);
  src.start(t);
}

// A bubble is a sine whose pitch shoots up as it pops. Its low start sounds
// louder than the click at the same level, so it plays much quieter.
function bubble(vol: number, delay = 0) {
  note(240 + Math.random() * 140, 900 + Math.random() * 600, 0.09, vol, delay);
}

const sounds = {
  click() {
    note(2200, 1400, 0.03, 0.08, 0, "triangle");
    note(1100, 900, 0.05, 0.05, 0.012);
  },
  bubble() {
    bubble(0.06);
  },
  bubbles() {
    for (const delay of [0, 0.07, 0.15]) bubble(0.04, delay);
  },
  blip() {
    note(520, 1500, 0.06, 0.04);
  },
  whoosh,
  open() {
    note(880, 880, 0.25, 0.07);
    note(1318.5, 1318.5, 0.35, 0.06, 0.06);
  },
  // An E major arpeggio with an octave shimmer.
  on() {
    [659.3, 830.6, 987.8, 1318.5].forEach((f, i) => {
      note(f, f, 1.1, 0.08, i * 0.075);
      note(f * 2, f * 2, 0.6, 0.015, i * 0.075);
    });
  },
  off() {
    note(987.8, 987.8, 0.3, 0.07);
    note(659.3, 659.3, 0.45, 0.07, 0.09);
  },
};

export function sfx(name: keyof typeof sounds) {
  if (!soundOn) return;
  // Callers such as a future fish scene may fire often; keep blips sparse.
  if (name === "blip") {
    if (performance.now() - lastBlip < 300) return;
    lastBlip = performance.now();
  }
  try {
    sounds[name]();
  } catch {
    // Audio is decoration; ignore browsers that refuse it.
  }
}
