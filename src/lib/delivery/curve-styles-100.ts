// ─────────────────────────────────────────────────────────────────────────────
// YoyoSMM 100 Neon Pacing Growth Graphs — Full Match for Design System
// ─────────────────────────────────────────────────────────────────────────────

export interface CurveStyleConfig {
  id: string;
  num: number;
  label: string;
  desc: string;
  warmup: number;
  peak: number;
  icon: string;
  category: string;
  stroke: string;
  glow: string;
  stop: string;
  evalCurve: (t: number, progress: number, totalSteps: number) => number;
}

export const CURVE_100_LIST: CurveStyleConfig[] = [
  // ── 1 to 10 ──
  {
    id: "SLOW_START", num: 1, label: "Slow Start", desc: "Gentle initial pacing that builds steady momentum over time.",
    warmup: 6, peak: 12, icon: "🐢", category: "Classic",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => Math.pow(p, 2.5) + 0.05
  },
  {
    id: "FAST", num: 2, label: "Fast Burst", desc: "Compressed high-speed curve with quicker ramp and immediate volume.",
    warmup: 2, peak: 4, icon: "⚡", category: "Classic",
    stroke: "#00ffff", glow: "rgba(0, 255, 255, 0.45)", stop: "#00b8b8",
    evalCurve: (t, p) => Math.pow(p, 0.35) + 0.1
  },
  {
    id: "LATE_TAKEOFF", num: 3, label: "Late Takeoff", desc: "Minimal early activity followed by an explosive final-hour surge.",
    warmup: 10, peak: 18, icon: "🛫", category: "Classic",
    stroke: "#39ff14", glow: "rgba(57, 255, 20, 0.45)", stop: "#24b30c",
    evalCurve: (t, p) => p < 0.6 ? 0.1 : Math.pow((p - 0.6) / 0.4, 3) + 0.1
  },
  {
    id: "STEADY_CLIMB", num: 4, label: "Steady Climb", desc: "Smooth, continuous upward slope with consistent hour-over-hour gains.",
    warmup: 4, peak: 10, icon: "🪜", category: "Classic",
    stroke: "#ffaa00", glow: "rgba(255, 170, 0, 0.45)", stop: "#b87a00",
    evalCurve: (t, p) => p * 0.8 + 0.2
  },
  {
    id: "EXPONENTIAL", num: 5, label: "Exponential Surge", desc: "Starts slowly and accelerates sharply. Ideal for countdown campaigns.",
    warmup: 4, peak: 8, icon: "🚀", category: "Classic",
    stroke: "#b800ff", glow: "rgba(184, 0, 255, 0.45)", stop: "#8200b8",
    evalCurve: (t, p) => Math.pow(p, 3.5) + 0.05
  },
  {
    id: "ORGANIC", num: 6, label: "Organic S-Curve", desc: "Natural viral growth — slow warmup, steady peak, smooth decay.",
    warmup: 4, peak: 8, icon: "🌅", category: "Classic",
    stroke: "#ff00aa", glow: "rgba(255, 0, 170, 0.45)", stop: "#b8007a",
    evalCurve: (t, p) => 1 / (1 + Math.exp(-6 * (p - 0.45)))
  },
  {
    id: "J_CURVE", num: 7, label: "J-Curve", desc: "Slight dip or flatline initially before a vertical viral lift-off.",
    warmup: 6, peak: 14, icon: "🪝", category: "Classic",
    stroke: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", stop: "#00b862",
    evalCurve: (t, p) => p < 0.4 ? 0.1 : Math.pow((p - 0.4) / 0.6, 4) + 0.1
  },
  {
    id: "REVERSE_J", num: 8, label: "Reverse J", desc: "Front-loaded massive burst that rounds off into a stable baseline.",
    warmup: 1, peak: 3, icon: "↩️", category: "Classic",
    stroke: "#ff3300", glow: "rgba(255, 51, 0, 0.45)", stop: "#b82400",
    evalCurve: (t, p) => Math.pow(1 - p, 3) * 0.9 + 0.1
  },
  {
    id: "LOGARITHMIC", num: 9, label: "Log Growth", desc: "Surges immediately on launch, then maintains a decelerating pace.",
    warmup: 1, peak: 4, icon: "🪵", category: "Classic",
    stroke: "#0088ff", glow: "rgba(0, 136, 255, 0.45)", stop: "#005bb8",
    evalCurve: (t, p) => Math.log10(p * 9 + 1) + 0.1
  },
  {
    id: "QUICK_SURGE", num: 10, label: "Quick Surge", desc: "Immediate rapid surge within the first quarter of the campaign.",
    warmup: 1, peak: 3, icon: "💨", category: "Classic",
    stroke: "#ffee00", glow: "rgba(255, 238, 0, 0.45)", stop: "#b8ab00",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.2) / 0.15, 2)) + 0.15
  },

  // ── 11 to 20 ──
  {
    id: "FIBONACCI", num: 11, label: "Gradual Growth", desc: "Paced delivery according to golden ratio compounding steps.",
    warmup: 3, peak: 8, icon: "🐚", category: "Standard",
    stroke: "#ff007f", glow: "rgba(255, 0, 127, 0.45)", stop: "#b8005b",
    evalCurve: (t, p) => Math.pow(1.618, p * 4) * 0.15 + 0.05
  },
  {
    id: "STEEP_WARMUP", num: 12, label: "Step Jump", desc: "Discrete upward step jumps at regular hourly milestones.",
    warmup: 1, peak: 4, icon: "🪜", category: "Standard",
    stroke: "#00ffcc", glow: "rgba(0, 255, 204, 0.45)", stop: "#00b893",
    evalCurve: (t, p) => Math.floor(p * 4) / 4 + 0.15
  },
  {
    id: "STEP_LADDER", num: 13, label: "Staircase", desc: "Multi-tiered plateau staircase delivering volume in locked blocks.",
    warmup: 2, peak: 6, icon: "🪜", category: "Standard",
    stroke: "#8a2be2", glow: "rgba(138, 43, 226, 0.45)", stop: "#5e1da6",
    evalCurve: (t, p) => Math.floor(p * 6) / 6 + 0.1
  },
  {
    id: "CLIPSTAKE", num: 14, label: "Wave Rise", desc: "Double-plateau step-wise curve simulating viral trigger prompts.",
    warmup: 3, peak: 6, icon: "🎲", category: "Standard",
    stroke: "#ff4500", glow: "rgba(255, 69, 0, 0.45)", stop: "#b83100",
    evalCurve: (t, p) => p < 0.33 ? 0.25 : p < 0.66 ? 0.6 : 1.0
  },
  {
    id: "SAWTOOTH", num: 15, label: "Zigzag Growth", desc: "Linear ramp-up cycles that sharply drop back and climb again.",
    warmup: 2, peak: 5, icon: "🪚", category: "Standard",
    stroke: "#7fff00", glow: "rgba(127, 255, 0, 0.45)", stop: "#5bb800",
    evalCurve: (t, p, s) => (t % Math.max(1, Math.floor(s / 4))) / Math.max(1, Math.floor(s / 4)) + 0.15
  },
  {
    id: "AGGRESSIVE", num: 16, label: "Spike Burst", desc: "Rapid high-intensity spike for immediate algorithm attention.",
    warmup: 1, peak: 2, icon: "🔥", category: "Standard",
    stroke: "#ff1493", glow: "rgba(255, 20, 147, 0.45)", stop: "#b80f6a",
    evalCurve: (t, p) => Math.exp(-p * 4.5) + 0.15
  },
  {
    id: "CROSSWAVE", num: 17, label: "Multiple Spikes", desc: "Oscillatory crest/trough waves simulating syndication pulses.",
    warmup: 4, peak: 8, icon: "🌊", category: "Standard",
    stroke: "#1e90ff", glow: "rgba(30, 144, 255, 0.45)", stop: "#1268b8",
    evalCurve: (t, p) => 0.5 + 0.4 * Math.sin(p * 6 * Math.PI)
  },
  {
    id: "ONE_BIG_SPIKE", num: 18, label: "One Big Spike", desc: "Single massive mid-campaign delivery spike with minimal baseline.",
    warmup: 6, peak: 10, icon: "📍", category: "Standard",
    stroke: "#ffd700", glow: "rgba(255, 215, 0, 0.45)", stop: "#b89b00",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.5) / 0.08, 2)) + 0.08
  },
  {
    id: "WHOP", num: 19, label: "Plateau", desc: "Commerce activity profile — sustained high-volume plateau.",
    warmup: 5, peak: 10, icon: "💳", category: "Standard",
    stroke: "#ff6347", glow: "rgba(255, 99, 71, 0.45)", stop: "#b84531",
    evalCurve: (t, p) => (p > 0.25 && p < 0.75) ? 1.0 : (p <= 0.25 ? p * 4 : (1 - p) * 4)
  },
  {
    id: "LONG_PLATEAU", num: 20, label: "Long Plateau", desc: "Extended ultra-stable delivery block across 80% of duration.",
    warmup: 2, peak: 16, icon: "🗄️", category: "Standard",
    stroke: "#00ced1", glow: "rgba(0, 206, 209, 0.45)", stop: "#009496",
    evalCurve: (t, p) => (p > 0.1 && p < 0.9) ? 0.9 : 0.2
  },

  // ── 21 to 30 ──
  {
    id: "MORNING_SURGE", num: 21, label: "Early Peak", desc: "Heavily front-loaded peak in the early hours to target feed checks.",
    warmup: 2, peak: 5, icon: "🌅", category: "Waves & Pulses",
    stroke: "#ff00aa", glow: "rgba(255, 0, 170, 0.45)", stop: "#b8007a",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.2) / 0.12, 2)) + 0.1
  },
  {
    id: "BELL_CURVE", num: 22, label: "Mid Peak", desc: "Symmetrical normal bell curve peaking precisely at midpoint.",
    warmup: 6, peak: 12, icon: "🔔", category: "Waves & Pulses",
    stroke: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", stop: "#00b862",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.5) / 0.18, 2)) + 0.1
  },
  {
    id: "EVENING_BLAST", num: 23, label: "Late Peak", desc: "Back-loaded dispatch peak targeted at evening leisure traffic.",
    warmup: 10, peak: 18, icon: "🌆", category: "Waves & Pulses",
    stroke: "#00ffff", glow: "rgba(0, 255, 255, 0.45)", stop: "#00b8b8",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.8) / 0.12, 2)) + 0.1
  },
  {
    id: "PICSART", num: 24, label: "Double Peak", desc: "Twin creative peaks simulating morning and afternoon viral waves.",
    warmup: 4, peak: 8, icon: "🎨", category: "Waves & Pulses",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.3) / 0.1, 2)) + Math.exp(-Math.pow((p - 0.7) / 0.1, 2)) + 0.15
  },
  {
    id: "TRIPLE_PEAK", num: 25, label: "Triple Peak", desc: "Three distinct traffic surges distributed across morning, noon, and night.",
    warmup: 3, peak: 9, icon: "🏔️", category: "Waves & Pulses",
    stroke: "#39ff14", glow: "rgba(57, 255, 20, 0.45)", stop: "#24b30c",
    evalCurve: (t, p) => Math.exp(-Math.pow((p - 0.2) / 0.08, 2)) + Math.exp(-Math.pow((p - 0.5) / 0.08, 2)) + Math.exp(-Math.pow((p - 0.8) / 0.08, 2)) + 0.1
  },
  {
    id: "NOON_PEAK", num: 26, label: "Rolling Peaks", desc: "Continuous sinusoidal rolling waves with high engagement floors.",
    warmup: 4, peak: 8, icon: "🎢", category: "Waves & Pulses",
    stroke: "#ffaa00", glow: "rgba(255, 170, 0, 0.45)", stop: "#b87a00",
    evalCurve: (t, p) => 0.5 + 0.35 * Math.sin(p * 4 * Math.PI)
  },
  {
    id: "UNEVEN_PEAKS", num: 27, label: "Uneven Peaks", desc: "Asymmetric wave pulses with an escalating secondary surge.",
    warmup: 3, peak: 10, icon: "⚡", category: "Waves & Pulses",
    stroke: "#b800ff", glow: "rgba(184, 0, 255, 0.45)", stop: "#8200b8",
    evalCurve: (t, p) => 0.5 * Math.exp(-Math.pow((p - 0.3) / 0.1, 2)) + 1.0 * Math.exp(-Math.pow((p - 0.75) / 0.1, 2)) + 0.1
  },
  {
    id: "FLAT_THEN_JUMP", num: 28, label: "Flat Then Jump", desc: "Stable low-volume baseline that abruptly leaps to max output at midpoint.",
    warmup: 8, peak: 14, icon: "📶", category: "Waves & Pulses",
    stroke: "#0088ff", glow: "rgba(0, 136, 255, 0.45)", stop: "#005bb8",
    evalCurve: (t, p) => p < 0.5 ? 0.2 : 0.95
  },
  {
    id: "JUMP_THEN_FLAT", num: 29, label: "Jump Then Flat", desc: "Instant leap to high volume maintained steadily until completion.",
    warmup: 1, peak: 12, icon: "🎚️", category: "Waves & Pulses",
    stroke: "#ffee00", glow: "rgba(255, 238, 0, 0.45)", stop: "#b8ab00",
    evalCurve: (t, p) => p < 0.15 ? 0.3 : 0.85
  },
  {
    id: "DROP_THEN_RISE", num: 30, label: "Drop Then Rise", desc: "Starts strong, dips during mid-hours, and rebounds heavily at end.",
    warmup: 3, peak: 15, icon: "🪦", category: "Waves & Pulses",
    stroke: "#ff007f", glow: "rgba(255, 0, 127, 0.45)", stop: "#b8005b",
    evalCurve: (t, p) => Math.pow(p - 0.5, 2) * 3 + 0.2
  },

  // ── 31 to 40 ──
  {
    id: "CLIPSTAR", num: 31, label: "Rise Then Drop", desc: "Immediate sustained viral burst with long-tail retention decay.",
    warmup: 2, peak: 12, icon: "⭐", category: "Surge Peaks",
    stroke: "#00ffcc", glow: "rgba(0, 255, 204, 0.45)", stop: "#00b893",
    evalCurve: (t, p) => Math.sin(p * Math.PI) * 0.9 + 0.1
  },
  {
    id: "SLOW_DECLINE", num: 32, label: "Slow Decline", desc: "High initial dispatch rate that tapers off very smoothly.",
    warmup: 1, peak: 4, icon: "📉", category: "Surge Peaks",
    stroke: "#8a2be2", glow: "rgba(138, 43, 226, 0.45)", stop: "#5e1da6",
    evalCurve: (t, p) => 1 - p * 0.7
  },
  {
    id: "STEEP_DECLINE", num: 33, label: "Steep Decline", desc: "Rapid drop-off after an immediate opening blast.",
    warmup: 1, peak: 2, icon: "⛷️", category: "Surge Peaks",
    stroke: "#ff4500", glow: "rgba(255, 69, 0, 0.45)", stop: "#b83100",
    evalCurve: (t, p) => Math.exp(-p * 3.5) + 0.1
  },
  {
    id: "SIGMOID_DECAY", num: 34, label: "Gradual Fall", desc: "Starts at maximum volume and stays flat before dropping in an S-curve.",
    warmup: 2, peak: 8, icon: "🥀", category: "Surge Peaks",
    stroke: "#7fff00", glow: "rgba(127, 255, 0, 0.45)", stop: "#5bb800",
    evalCurve: (t, p) => 1 / (1 + Math.exp(6 * (p - 0.5)))
  },
  {
    id: "STEP_DECLINE", num: 35, label: "Step Decline", desc: "Decreases delivery volume in locked downward step tiers.",
    warmup: 2, peak: 6, icon: "🪜", category: "Surge Peaks",
    stroke: "#ff1493", glow: "rgba(255, 20, 147, 0.45)", stop: "#b80f6a",
    evalCurve: (t, p) => 1 - Math.floor(p * 4) / 4 * 0.8
  },
  {
    id: "SHARP_DROP", num: 36, label: "Sharp Drop", desc: "High plateau that sharply plunges in the final campaign phase.",
    warmup: 4, peak: 12, icon: "🪂", category: "Surge Peaks",
    stroke: "#1e90ff", glow: "rgba(30, 144, 255, 0.45)", stop: "#1268b8",
    evalCurve: (t, p) => p < 0.7 ? 0.9 : 0.15
  },
  {
    id: "CLIFF_DROP", num: 37, label: "Cliff Drop", desc: "Maximum output maintained until an instant drop-off at 80% mark.",
    warmup: 2, peak: 14, icon: "🧗", category: "Surge Peaks",
    stroke: "#ffd700", glow: "rgba(255, 215, 0, 0.45)", stop: "#b89b00",
    evalCurve: (t, p) => p < 0.8 ? 1.0 : 0.05
  },
  {
    id: "DROP_RECOVER", num: 38, label: "Drop & Recover", desc: "Early drop that recovers strongly towards campaign finish.",
    warmup: 4, peak: 12, icon: "🪃", category: "Surge Peaks",
    stroke: "#ff6347", glow: "rgba(255, 99, 71, 0.45)", stop: "#b84531",
    evalCurve: (t, p) => p < 0.4 ? (0.8 - p) : (p * 1.1)
  },
  {
    id: "V_SHAPE", num: 39, label: "V-Shape", desc: "Sharp midpoint dip with equal high-volume start and end.",
    warmup: 4, peak: 14, icon: "v", category: "Surge Peaks",
    stroke: "#00ced1", glow: "rgba(0, 206, 209, 0.45)", stop: "#009496",
    evalCurve: (t, p) => Math.abs(p - 0.5) * 1.8 + 0.1
  },
  {
    id: "U_SHAPE", num: 40, label: "U-Shape", desc: "Smooth rounded trough in the middle with elevated opening and closing.",
    warmup: 5, peak: 15, icon: "u", category: "Surge Peaks",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => Math.pow(p - 0.5, 2) * 3 + 0.2
  },

  // ── 41 to 50 ──
  {
    id: "W_SHAPE", num: 41, label: "W-Shape", desc: "Dual troughs creating a dynamic W-pattern engagement profile.",
    warmup: 4, peak: 10, icon: "w", category: "Specialized",
    stroke: "#00ffff", glow: "rgba(0, 255, 255, 0.45)", stop: "#00b8b8",
    evalCurve: (t, p) => Math.abs(Math.sin(p * 2 * Math.PI)) * 0.8 + 0.2
  },
  {
    id: "INVERTED_W", num: 42, label: "Inverted W", desc: "Twin peaks separated by a brief midpoint stabilization.",
    warmup: 4, peak: 10, icon: "m", category: "Specialized",
    stroke: "#39ff14", glow: "rgba(57, 255, 20, 0.45)", stop: "#24b30c",
    evalCurve: (t, p) => 1 - Math.abs(Math.sin(p * 2 * Math.PI)) * 0.7
  },
  {
    id: "N_SHAPE", num: 43, label: "N-Shape", desc: "Sharp rise, diagonal consolidation drop, and secondary breakout.",
    warmup: 3, peak: 12, icon: "n", category: "Specialized",
    stroke: "#ffaa00", glow: "rgba(255, 170, 0, 0.45)", stop: "#b87a00",
    evalCurve: (t, p) => p < 0.3 ? p * 3 : p < 0.7 ? (1 - (p - 0.3) * 1.5) : ((p - 0.7) * 3 + 0.4)
  },
  {
    id: "M_SHAPE", num: 44, label: "M-Shape", desc: "Classic double-top formation with strong mid-campaign presence.",
    warmup: 3, peak: 12, icon: "M", category: "Specialized",
    stroke: "#b800ff", glow: "rgba(184, 0, 255, 0.45)", stop: "#8200b8",
    evalCurve: (t, p) => Math.sin(p * 2 * Math.PI) > 0 ? Math.sin(p * 2 * Math.PI) * 0.8 + 0.2 : 0.2
  },
  {
    id: "Z_PATTERN", num: 45, label: "Z-Pattern", desc: "High top shelf, diagonal transition, and solid bottom shelf.",
    warmup: 4, peak: 10, icon: "z", category: "Specialized",
    stroke: "#ff00aa", glow: "rgba(255, 0, 170, 0.45)", stop: "#b8007a",
    evalCurve: (t, p) => p < 0.3 ? 0.9 : p < 0.7 ? (0.9 - (p - 0.3) * 1.8) : 0.2
  },
  {
    id: "FLATLINE", num: 46, label: "Flatline", desc: "Absolute steady-state output from first minute to last.",
    warmup: 0, peak: 24, icon: "━", category: "Specialized",
    stroke: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", stop: "#00b862",
    evalCurve: (t, p) => 0.6
  },
  {
    id: "SLIGHT_RISE", num: 47, label: "Slight Rise", desc: "Mild, gentle upward drift across the delivery timeline.",
    warmup: 4, peak: 16, icon: "↗️", category: "Specialized",
    stroke: "#ff3300", glow: "rgba(255, 51, 0, 0.45)", stop: "#b82400",
    evalCurve: (t, p) => 0.4 + p * 0.4
  },
  {
    id: "SLIGHT_FALL", num: 48, label: "Slight Fall", desc: "Mild downward drift that retains solid baseline activity.",
    warmup: 2, peak: 8, icon: "↘️", category: "Specialized",
    stroke: "#0088ff", glow: "rgba(0, 136, 255, 0.45)", stop: "#005bb8",
    evalCurve: (t, p) => 0.8 - p * 0.4
  },
  {
    id: "NOISY_GROWTH", num: 49, label: "Noisy Growth", desc: "Upward trend heavily layered with organic micro-fluctuations.",
    warmup: 4, peak: 12, icon: "📶", category: "Specialized",
    stroke: "#ffee00", glow: "rgba(255, 238, 0, 0.45)", stop: "#b8ab00",
    evalCurve: (t, p) => (p * 0.7 + 0.2) * (0.8 + Math.sin(p * 20) * 0.2)
  },
  {
    id: "CHAOTIC", num: 50, label: "Random Walk", desc: "Simulates pseudo-random fluctuations to mimic organic user patterns.",
    warmup: 4, peak: 12, icon: "🌀", category: "Specialized",
    stroke: "#ff007f", glow: "rgba(255, 0, 127, 0.45)", stop: "#b8005b",
    evalCurve: (t, p) => 0.5 + 0.3 * Math.sin(p * 7) * Math.cos(p * 13)
  },

  // ── 51 to 60 ──
  {
    id: "CONSISTENT_GROWTH", num: 51, label: "Consistent Growth", desc: "Rock-solid 45-degree linear growth trajectory.",
    warmup: 4, peak: 14, icon: "📈", category: "Patterns",
    stroke: "#00ffcc", glow: "rgba(0, 255, 204, 0.45)", stop: "#00b893",
    evalCurve: (t, p) => p * 0.85 + 0.15
  },
  {
    id: "LINEAR", num: 52, label: "Linear Growth", desc: "Constant equal-increment delivery rate over the entire campaign.",
    warmup: 4, peak: 14, icon: "📏", category: "Patterns",
    stroke: "#8a2be2", glow: "rgba(138, 43, 226, 0.45)", stop: "#5e1da6",
    evalCurve: (t, p) => p * 0.9 + 0.1
  },
  {
    id: "S_CURVE", num: 53, label: "Nonlinear Growth", desc: "Curved upward progression accelerating midway.",
    warmup: 5, peak: 12, icon: "〰️", category: "Patterns",
    stroke: "#ff4500", glow: "rgba(255, 69, 0, 0.45)", stop: "#b83100",
    evalCurve: (t, p) => Math.pow(p, 1.8) * 0.8 + 0.15
  },
  {
    id: "QUADRATIC", num: 54, label: "Accelerating", desc: "Accelerates at a moderate squared rate for viral build-up.",
    warmup: 4, peak: 10, icon: "📐", category: "Patterns",
    stroke: "#7fff00", glow: "rgba(127, 255, 0, 0.45)", stop: "#5bb800",
    evalCurve: (t, p) => Math.pow(p, 2) * 0.85 + 0.1
  },
  {
    id: "DECELERATING", num: 55, label: "Decelerating", desc: "Fast start that gradually eases into a gentle closing slope.",
    warmup: 2, peak: 6, icon: "🛬", category: "Patterns",
    stroke: "#ff1493", glow: "rgba(255, 20, 147, 0.45)", stop: "#b80f6a",
    evalCurve: (t, p) => Math.pow(p, 0.5) * 0.8 + 0.15
  },
  {
    id: "PARABOLIC_RISE", num: 56, label: "Parabolic Rise", desc: "Ultra-steep parabolic curve simulating runaway viral spread.",
    warmup: 6, peak: 14, icon: "🚀", category: "Patterns",
    stroke: "#1e90ff", glow: "rgba(30, 144, 255, 0.45)", stop: "#1268b8",
    evalCurve: (t, p) => Math.pow(p, 3) * 0.9 + 0.1
  },
  {
    id: "PARABOLIC_FALL", num: 57, label: "Parabolic Fall", desc: "High peak launch descending along a parabolic decay curve.",
    warmup: 1, peak: 4, icon: "🪂", category: "Patterns",
    stroke: "#ffd700", glow: "rgba(255, 215, 0, 0.45)", stop: "#b89b00",
    evalCurve: (t, p) => Math.pow(1 - p, 2) * 0.85 + 0.15
  },
  {
    id: "CUBIC", num: 58, label: "Hyper Growth", desc: "Aggressive third-degree curve with sharper final surge.",
    warmup: 6, peak: 16, icon: "🧮", category: "Patterns",
    stroke: "#ff6347", glow: "rgba(255, 99, 71, 0.45)", stop: "#b84531",
    evalCurve: (t, p) => Math.pow(p, 4) * 0.9 + 0.1
  },
  {
    id: "SATURATION", num: 59, label: "Saturation", desc: "Rapid volume fill reaching algorithm saturation early.",
    warmup: 2, peak: 8, icon: "🌊", category: "Patterns",
    stroke: "#00ced1", glow: "rgba(0, 206, 209, 0.45)", stop: "#009496",
    evalCurve: (t, p) => 1 - Math.exp(-p * 5)
  },
  {
    id: "PARETO", num: 60, label: "Tapering Off", desc: "Dispatches 80% of volume in the first 20% of duration.",
    warmup: 1, peak: 4, icon: "📊", category: "Patterns",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => Math.pow(1 - p, 3) + 0.05
  },

  // ── 61 to 70 ──
  {
    id: "SINE_WAVE", num: 61, label: "Seasonal Wave", desc: "Smooth sinusoidal cycles mimicking daily traffic seasonality.",
    warmup: 4, peak: 12, icon: "〰️", category: "Cycles & Trends",
    stroke: "#00ffff", glow: "rgba(0, 255, 255, 0.45)", stop: "#00b8b8",
    evalCurve: (t, p) => 0.5 + 0.4 * Math.sin(p * 4 * Math.PI)
  },
  {
    id: "COSINE_WAVE", num: 62, label: "Weekly Cycle", desc: "Starts at peak output, dipping and recovering in weekly waves.",
    warmup: 4, peak: 12, icon: "🎢", category: "Cycles & Trends",
    stroke: "#39ff14", glow: "rgba(57, 255, 20, 0.45)", stop: "#24b30c",
    evalCurve: (t, p) => 0.5 + 0.4 * Math.cos(p * 4 * Math.PI)
  },
  {
    id: "MONTHLY_CYCLE", num: 63, label: "Monthly Cycle", desc: "Long-period wave pattern representing multi-week campaigns.",
    warmup: 6, peak: 16, icon: "📅", category: "Cycles & Trends",
    stroke: "#ffaa00", glow: "rgba(255, 170, 0, 0.45)", stop: "#b87a00",
    evalCurve: (t, p) => 0.5 + 0.35 * Math.sin(p * 2 * Math.PI)
  },
  {
    id: "TREND_SEASON", num: 64, label: "Trend + Season", desc: "Upward linear trend combined with rhythmic wave cycles.",
    warmup: 4, peak: 12, icon: "📈", category: "Cycles & Trends",
    stroke: "#b800ff", glow: "rgba(184, 0, 255, 0.45)", stop: "#8200b8",
    evalCurve: (t, p) => (p * 0.6 + 0.2) + 0.2 * Math.sin(p * 6 * Math.PI)
  },
  {
    id: "UPWARD_TRENDLINE", num: 65, label: "Upward Trendline", desc: "Clean upward channel with bounded upper and lower limits.",
    warmup: 4, peak: 14, icon: "↗️", category: "Cycles & Trends",
    stroke: "#ff00aa", glow: "rgba(255, 0, 170, 0.45)", stop: "#b8007a",
    evalCurve: (t, p) => 0.2 + p * 0.7
  },
  {
    id: "DOWNWARD_TRENDLINE", num: 66, label: "Downward Trendline", desc: "Controlled downward channel maintaining high retention.",
    warmup: 2, peak: 6, icon: "↘️", category: "Cycles & Trends",
    stroke: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", stop: "#00b862",
    evalCurve: (t, p) => 0.9 - p * 0.7
  },
  {
    id: "CHANNEL_UP", num: 67, label: "Channel Up", desc: "Ascending price channel with alternating support/resistance touches.",
    warmup: 4, peak: 12, icon: "🛣️", category: "Cycles & Trends",
    stroke: "#ff3300", glow: "rgba(255, 51, 0, 0.45)", stop: "#b82400",
    evalCurve: (t, p) => (p * 0.6 + 0.2) + 0.15 * ((Math.floor(p * 10) % 2 === 0) ? 1 : -1)
  },
  {
    id: "CHANNEL_DOWN", num: 68, label: "Channel Down", desc: "Descending channel pattern with controlled volume steps.",
    warmup: 2, peak: 8, icon: "🔻", category: "Cycles & Trends",
    stroke: "#0088ff", glow: "rgba(0, 136, 255, 0.45)", stop: "#005bb8",
    evalCurve: (t, p) => (0.8 - p * 0.5) + 0.1 * ((Math.floor(p * 10) % 2 === 0) ? 1 : -1)
  },
  {
    id: "BREAKOUT_UP", num: 69, label: "Breakout Up", desc: "Tight consolidation followed by an explosive vertical breakout.",
    warmup: 8, peak: 16, icon: "💥", category: "Cycles & Trends",
    stroke: "#ffee00", glow: "rgba(255, 238, 0, 0.45)", stop: "#b8ab00",
    evalCurve: (t, p) => p < 0.7 ? 0.25 : 0.95
  },
  {
    id: "BREAKOUT_DOWN", num: 70, label: "Breakout Down", desc: "High baseline activity that breaks downward into a quiet tail.",
    warmup: 2, peak: 8, icon: "⚡", category: "Cycles & Trends",
    stroke: "#ff007f", glow: "rgba(255, 0, 127, 0.45)", stop: "#b8005b",
    evalCurve: (t, p) => p < 0.7 ? 0.8 : 0.15
  },

  // ── 71 to 80 ──
  {
    id: "RETEST_SUPPORT", num: 71, label: "Retest Support", desc: "Dips to test baseline support twice before launching upward.",
    warmup: 6, peak: 14, icon: "🛡️", category: "Technical Formations",
    stroke: "#00ffcc", glow: "rgba(0, 255, 204, 0.45)", stop: "#00b893",
    evalCurve: (t, p) => p < 0.3 ? 0.5 : p < 0.6 ? 0.2 : 0.9
  },
  {
    id: "RETEST_RESISTANCE", num: 72, label: "Retest Resistance", desc: "Surges to ceiling twice before breaking through to new highs.",
    warmup: 4, peak: 12, icon: "⚔️", category: "Technical Formations",
    stroke: "#8a2be2", glow: "rgba(138, 43, 226, 0.45)", stop: "#5e1da6",
    evalCurve: (t, p) => p < 0.4 ? 0.8 : p < 0.7 ? 0.5 : 1.0
  },
  {
    id: "BOUNCING_BALL", num: 73, label: "Bouncing Ball", desc: "Decaying bounce peaks simulating damping momentum.",
    warmup: 2, peak: 8, icon: "🏀", category: "Technical Formations",
    stroke: "#ff4500", glow: "rgba(255, 69, 0, 0.45)", stop: "#b83100",
    evalCurve: (t, p) => Math.abs(Math.sin(p * 4 * Math.PI)) * (1 - p * 0.6) + 0.1
  },
  {
    id: "ALTERNATING", num: 74, label: "Ping Pong", desc: "Rapid oscillation between high and low delivery tiers.",
    warmup: 2, peak: 10, icon: "🏓", category: "Technical Formations",
    stroke: "#7fff00", glow: "rgba(127, 255, 0, 0.45)", stop: "#5bb800",
    evalCurve: (t, p, s) => (Math.floor(t) % 2 === 0) ? 0.9 : 0.15
  },
  {
    id: "VOLATILE", num: 75, label: "Volatile", desc: "High-amplitude sharp swings for maximum algorithm stimulation.",
    warmup: 4, peak: 12, icon: "🌩️", category: "Technical Formations",
    stroke: "#ff1493", glow: "rgba(255, 20, 147, 0.45)", stop: "#b80f6a",
    evalCurve: (t, p) => 0.5 + 0.45 * Math.sin(p * 11)
  },
  {
    id: "LOW_VOLATILITY", num: 76, label: "Low Volatility", desc: "Ultra-tight, minimal variance delivery around median speed.",
    warmup: 4, peak: 16, icon: "🍃", category: "Technical Formations",
    stroke: "#1e90ff", glow: "rgba(30, 144, 255, 0.45)", stop: "#1268b8",
    evalCurve: (t, p) => 0.5 + 0.05 * Math.sin(p * 8)
  },
  {
    id: "CONSOLIDATION", num: 77, label: "Consolidation", desc: "Tight lateral price movement building fuel for campaign end.",
    warmup: 6, peak: 16, icon: "📦", category: "Technical Formations",
    stroke: "#ffd700", glow: "rgba(255, 215, 0, 0.45)", stop: "#b89b00",
    evalCurve: (t, p) => 0.45 + 0.1 * Math.sin(p * 14)
  },
  {
    id: "TRIANGLE_BREAKOUT", num: 78, label: "Triangle Breakout", desc: "Converging volatility coil that explodes upward at apex.",
    warmup: 6, peak: 14, icon: "📐", category: "Technical Formations",
    stroke: "#ff6347", glow: "rgba(255, 99, 71, 0.45)", stop: "#b84531",
    evalCurve: (t, p) => p < 0.7 ? (0.5 + 0.3 * (1 - p) * Math.sin(p * 15)) : 0.95
  },
  {
    id: "INVERSE_TRIANGLE", num: 79, label: "Inverse Triangle", desc: "Expanding volatility megaphone pattern across duration.",
    warmup: 4, peak: 12, icon: "📢", category: "Technical Formations",
    stroke: "#00ced1", glow: "rgba(0, 206, 209, 0.45)", stop: "#009496",
    evalCurve: (t, p) => 0.5 + 0.4 * p * Math.sin(p * 12)
  },
  {
    id: "PENNANT", num: 80, label: "Pennant", desc: "Steep flagpole mast followed by converging consolidation.",
    warmup: 2, peak: 6, icon: "🚩", category: "Technical Formations",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => p < 0.2 ? 0.9 : (0.5 + 0.2 * (1 - p) * Math.sin(p * 10))
  },

  // ── 81 to 90 ──
  {
    id: "CUP_HANDLE", num: 81, label: "Cup & Handle", desc: "Rounded bottom cup formation topped with a breakout handle.",
    warmup: 6, peak: 14, icon: "☕", category: "Chart Patterns",
    stroke: "#00ffff", glow: "rgba(0, 255, 255, 0.45)", stop: "#00b8b8",
    evalCurve: (t, p) => p < 0.7 ? (Math.pow((p - 0.35) / 0.35, 2) * 0.7 + 0.2) : (p < 0.85 ? 0.6 : 0.95)
  },
  {
    id: "ROUNDED_BOTTOM", num: 82, label: "Rounded Bottom", desc: "Long smooth saucer bottom accumulation curve.",
    warmup: 6, peak: 16, icon: "🥣", category: "Chart Patterns",
    stroke: "#39ff14", glow: "rgba(57, 255, 20, 0.45)", stop: "#24b30c",
    evalCurve: (t, p) => Math.pow((p - 0.5) / 0.5, 2) * 0.7 + 0.15
  },
  {
    id: "BOUNDED_TOP", num: 83, label: "Bounded Top", desc: "Rounded umbrella dome capping maximum hourly delivery.",
    warmup: 4, peak: 12, icon: "☂️", category: "Chart Patterns",
    stroke: "#ffaa00", glow: "rgba(255, 170, 0, 0.45)", stop: "#b87a00",
    evalCurve: (t, p) => 0.9 - Math.pow((p - 0.5) / 0.5, 2) * 0.7
  },
  {
    id: "ASCENDING_TRIANGLE", num: 84, label: "Ascending Triangle", desc: "Flat resistance ceiling with rising support lows.",
    warmup: 4, peak: 12, icon: "📐", category: "Chart Patterns",
    stroke: "#b800ff", glow: "rgba(184, 0, 255, 0.45)", stop: "#8200b8",
    evalCurve: (t, p) => (Math.floor(p * 8) % 2 === 0) ? 0.85 : (0.2 + p * 0.6)
  },
  {
    id: "DESCENDING_TRIANGLE", num: 85, label: "Descending Triangle", desc: "Lowering highs pressing against a flat baseline support.",
    warmup: 4, peak: 10, icon: "🔻", category: "Chart Patterns",
    stroke: "#ff00aa", glow: "rgba(255, 0, 170, 0.45)", stop: "#b8007a",
    evalCurve: (t, p) => (Math.floor(p * 8) % 2 === 0) ? (0.85 - p * 0.6) : 0.2
  },
  {
    id: "SYMMETRICAL_TRIANGLE", num: 86, label: "Symmetrical Triangle", desc: "Equally converging highs and lows coiling toward midpoint.",
    warmup: 5, peak: 12, icon: "⚡", category: "Chart Patterns",
    stroke: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", stop: "#00b862",
    evalCurve: (t, p) => 0.5 + (1 - p) * 0.4 * ((Math.floor(p * 10) % 2 === 0) ? 1 : -1)
  },
  {
    id: "FLAG_PATTERN", num: 87, label: "Flag Pattern", desc: "Steep mast launch followed by parallel downward flag channel.",
    warmup: 2, peak: 6, icon: "🏁", category: "Chart Patterns",
    stroke: "#ff3300", glow: "rgba(255, 51, 0, 0.45)", stop: "#b82400",
    evalCurve: (t, p) => p < 0.2 ? 0.9 : (0.7 - (p - 0.2) * 0.3)
  },
  {
    id: "WEDGE_PATTERN", num: 88, label: "Wedge Pattern", desc: "Tightly angled wedge formation signaling an impending reversal.",
    warmup: 4, peak: 12, icon: "🍕", category: "Chart Patterns",
    stroke: "#0088ff", glow: "rgba(0, 136, 255, 0.45)", stop: "#005bb8",
    evalCurve: (t, p) => 0.3 + p * 0.5 + 0.1 * Math.sin(p * 12)
  },
  {
    id: "DIAMOND_TOP", num: 89, label: "Diamond Top", desc: "Expanding then contracting diamond formation at peak volume.",
    warmup: 5, peak: 12, icon: "💎", category: "Chart Patterns",
    stroke: "#ffee00", glow: "rgba(255, 238, 0, 0.45)", stop: "#b8ab00",
    evalCurve: (t, p) => p < 0.5 ? (0.2 + p * 1.4) : (1.6 - p * 1.4)
  },
  {
    id: "DIAMOND_BOTTOM", num: 90, label: "Diamond Bottom", desc: "Inverted diamond pattern forming a solid volume base.",
    warmup: 5, peak: 14, icon: "💠", category: "Chart Patterns",
    stroke: "#ff007f", glow: "rgba(255, 0, 127, 0.45)", stop: "#b8005b",
    evalCurve: (t, p) => p < 0.5 ? (0.9 - p * 1.4) : (p * 1.4 - 0.5)
  },

  // ── 91 to 100 ──
  {
    id: "HEAD_SHOULDERS", num: 91, label: "Head & Shoulders", desc: "Left shoulder, dominant head peak, and right shoulder profile.",
    warmup: 4, peak: 10, icon: "👤", category: "Pro Formations",
    stroke: "#00ffcc", glow: "rgba(0, 255, 204, 0.45)", stop: "#00b893",
    evalCurve: (t, p) => p < 0.33 ? (0.5 * Math.sin(p * 3 * Math.PI) + 0.2) : p < 0.66 ? (0.85 * Math.sin((p - 0.33) * 3 * Math.PI) + 0.15) : (0.5 * Math.sin((p - 0.66) * 3 * Math.PI) + 0.2)
  },
  {
    id: "INVERSE_HS", num: 92, label: "Inverse H&S", desc: "Inverted three-trough accumulation bottom before takeoff.",
    warmup: 6, peak: 16, icon: "🙃", category: "Pro Formations",
    stroke: "#8a2be2", glow: "rgba(138, 43, 226, 0.45)", stop: "#5e1da6",
    evalCurve: (t, p) => 1 - (p < 0.33 ? (0.5 * Math.sin(p * 3 * Math.PI) + 0.2) : p < 0.66 ? (0.8 * Math.sin((p - 0.33) * 3 * Math.PI) + 0.15) : (0.5 * Math.sin((p - 0.66) * 3 * Math.PI) + 0.2))
  },
  {
    id: "BROADENING_TOP", num: 93, label: "Broadening Top", desc: "Megaphone top expanding swings reaching maximum variance.",
    warmup: 4, peak: 12, icon: "📢", category: "Pro Formations",
    stroke: "#ff4500", glow: "rgba(255, 69, 0, 0.45)", stop: "#b83100",
    evalCurve: (t, p) => 0.5 + p * 0.45 * ((Math.floor(p * 12) % 2 === 0) ? 1 : -1)
  },
  {
    id: "BROADENING_BOTTOM", num: 94, label: "Broadening Bottom", desc: "Widening downward channel forming a volatile bottom.",
    warmup: 4, peak: 14, icon: "📯", category: "Pro Formations",
    stroke: "#7fff00", glow: "rgba(127, 255, 0, 0.45)", stop: "#5bb800",
    evalCurve: (t, p) => 0.5 - p * 0.4 * ((Math.floor(p * 12) % 2 === 0) ? 1 : -1)
  },
  {
    id: "TIGHT_RANGE", num: 95, label: "Tight Range", desc: "Laser-focused horizontal channel with zero variance.",
    warmup: 2, peak: 20, icon: "🎯", category: "Pro Formations",
    stroke: "#ff1493", glow: "rgba(255, 20, 147, 0.45)", stop: "#b80f6a",
    evalCurve: (t, p) => 0.55 + 0.02 * Math.sin(p * 20)
  },
  {
    id: "EXPANDING_RANGE", num: 96, label: "Expanding Range", desc: "Starts tight and progressively widens hourly swings.",
    warmup: 4, peak: 12, icon: "↔️", category: "Pro Formations",
    stroke: "#1e90ff", glow: "rgba(30, 144, 255, 0.45)", stop: "#1268b8",
    evalCurve: (t, p) => 0.5 + p * 0.4 * Math.sin(p * 16)
  },
  {
    id: "VOLATILITY_SQUEEZE", num: 97, label: "Volatility Squeeze", desc: "High initial swings converging into a pinpoint squeeze.",
    warmup: 4, peak: 14, icon: "🗜️", category: "Pro Formations",
    stroke: "#ffd700", glow: "rgba(255, 215, 0, 0.45)", stop: "#b89b00",
    evalCurve: (t, p) => 0.5 + (1 - p) * 0.45 * Math.sin(p * 16)
  },
  {
    id: "EXPANSION", num: 98, label: "Expansion", desc: "Explosive upward volume expansion across all tiers.",
    warmup: 2, peak: 8, icon: "🌌", category: "Pro Formations",
    stroke: "#ff6347", glow: "rgba(255, 99, 71, 0.45)", stop: "#b84531",
    evalCurve: (t, p) => Math.pow(p, 1.5) * 0.9 + 0.1
  },
  {
    id: "PUMP_DUMP", num: 99, label: "Pump & Dump", desc: "Instantaneous parabolic pump followed by rapid volume exit.",
    warmup: 1, peak: 2, icon: "💉", category: "Pro Formations",
    stroke: "#00ced1", glow: "rgba(0, 206, 209, 0.45)", stop: "#009496",
    evalCurve: (t, p) => p < 0.25 ? (p * 3.6 + 0.1) : Math.exp(-(p - 0.25) * 6) + 0.1
  },
  {
    id: "DOUBLE_BELL", num: 100, label: "Organic Mix", desc: "The ultimate hybrid organic curve combining waves and surges.",
    warmup: 4, peak: 10, icon: "🎛️", category: "Pro Formations",
    stroke: "#ff0055", glow: "rgba(255, 0, 85, 0.45)", stop: "#c0003c",
    evalCurve: (t, p) => 0.2 + 0.5 * (1 / (1 + Math.exp(-6 * (p - 0.4)))) + 0.2 * Math.sin(p * 4 * Math.PI)
  }
];

// Helper dictionaries for lightning-fast lookup
export const CURVE_100_MAP: Record<string, CurveStyleConfig> = CURVE_100_LIST.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<string, CurveStyleConfig>);

if (CURVE_100_MAP["S_CURVE"]) {
  CURVE_100_MAP["NONLINEAR_GROWTH"] = CURVE_100_MAP["S_CURVE"];
}

export const CURVE_DESCRIPTIONS_100: Record<string, { label: string; desc: string; warmup: number; peak: number; icon: string; category: string; num: number }> =
  CURVE_100_LIST.reduce((acc, item) => {
    acc[item.id] = {
      label: item.label,
      desc: item.desc,
      warmup: item.warmup,
      peak: item.peak,
      icon: item.icon,
      category: item.category,
      num: item.num
    };
    return acc;
  }, {} as any);

if (CURVE_DESCRIPTIONS_100["S_CURVE"]) {
  CURVE_DESCRIPTIONS_100["NONLINEAR_GROWTH"] = CURVE_DESCRIPTIONS_100["S_CURVE"];
}

export const STYLE_NEON_COLORS_100: Record<string, { stroke: string; glow: string; stop: string }> =
  CURVE_100_LIST.reduce((acc, item) => {
    acc[item.id] = { stroke: item.stroke, glow: item.glow, stop: item.stop };
    return acc;
  }, {} as any);

if (STYLE_NEON_COLORS_100["S_CURVE"]) {
  STYLE_NEON_COLORS_100["NONLINEAR_GROWTH"] = STYLE_NEON_COLORS_100["S_CURVE"];
}
