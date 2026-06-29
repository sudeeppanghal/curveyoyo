// ─────────────────────────────────────────────────────────────
// S-Curve Delivery Engine — Views + Engagement + Peak-Hour
// Logistic: V(t) = K / (1 + e^(-r(t - t0)))
// ─────────────────────────────────────────────────────────────

export interface CurveParams {
  totalViews: number;
  durationHours: number;
  warmupHours: number;
  peakHours: number;
  style: "ORGANIC" | "FAST" | "AGGRESSIVE" | "WHOP" | "CLIPSTAKE" | "CLIPSTAR" | "PICSART" | "CROSSWAVE"
    | "LINEAR" | "EXPONENTIAL" | "S_CURVE" | "BELL_CURVE" | "LOGARITHMIC" | "QUADRATIC" | "CUBIC"
    | "SINE_WAVE" | "COSINE_WAVE" | "SAWTOOTH" | "CHAOTIC" | "DOUBLE_BELL" | "STEP_LADDER"
    | "ALTERNATING" | "FIBONACCI" | "PARETO" | "MORNING_SURGE" | "NOON_PEAK" | "EVENING_BLAST"
    | "SIGMOID_DECAY" | "STEEP_WARMUP";
  // Engagement
  engagementEnabled?: boolean;
  likesRatioPct?: number;
  savesRatioPct?: number;
  sharesRatioPct?: number;
  commentsRatioPct?: number;
  // Timezone offset from UTC in hours (e.g. +5.5 for IST)
  tzOffsetHours?: number;
}

export interface DeliveryBatch {
  hour: number;
  scheduledDelayMs: number;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
}

/**
 * Growth rate (r) per style — tuned to match CurvePioneer's exact blog examples.
 * r=0.8 → gradual 36-48h authentic curve (their "Evergreen" preset)
 * r=1.2 → standard 24h delivery (their "Standard" / our FAST)
 * r=2.0 → rapid 6-16h viral burst (their "Viral" / our AGGRESSIVE)
 */
const RATES: Record<string, number> = {
  ORGANIC:    0.8,
  FAST:       1.2,
  AGGRESSIVE: 2.0,
  WHOP:       0.65,
  CLIPSTAKE:  1.0,
  CLIPSTAR:   1.5,
  PICSART:    0.75,
  CROSSWAVE:  0.9,
};

/**
 * Apply ±jitterPct random noise to a batch quantity.
 *
 * CurvePioneer: "Real human traffic has variance — sometimes 48 views in an hour,
 * sometimes 52. We add small random jitter to each batch to prevent machine-flat
 * delivery patterns."
 *
 * The accumulation algorithm in calculateEngagementDue() self-corrects for drift
 * so the total always equals the target by the end of the campaign.
 */
export function applyJitter(qty: number, jitterPct = 0.15): number {
  if (qty <= 0) return 0;
  const factor = 1 + (Math.random() * 2 - 1) * jitterPct;
  return Math.max(1, Math.round(qty * factor));
}

/**
 * Peak-hour multiplier — mimics real audience traffic patterns.
 * CurvePioneer: "Orders cluster during high-traffic windows and slow at night"
 *
 * Peak:   9am–12pm, 6pm–10pm → 1.5×
 * Normal: 12pm–6pm            → 1.0×
 * Night:  10pm–9am            → 0.4×
 */
export function peakHourMultiplier(utcHour: number, tzOffsetHours = 5.5): number {
  const localHour = ((utcHour + tzOffsetHours) % 24 + 24) % 24;
  if ((localHour >= 9 && localHour < 12) || (localHour >= 18 && localHour < 22)) return 1.5;
  if (localHour >= 12 && localHour < 18) return 1.0;
  return 0.4;
}

/**
 * Generates per-hour delivery batches following a logistic S-curve with peak-hour weighting.
 * Engagement quantities per batch are proportional to views in that batch.
 */
export function generateDeliverySchedule(params: CurveParams): DeliveryBatch[] {
  const {
    totalViews, durationHours, warmupHours, peakHours, style,
    engagementEnabled = true,
    likesRatioPct = 4.0, savesRatioPct = 2.0,
    sharesRatioPct = 0.5, commentsRatioPct = 0.2,
    tzOffsetHours = 5.5,
  } = params;

  const RATES_MAP: Record<string, number> = RATES;
  const nowUtcHour = new Date().getUTCHours();

  const raw = Array.from({ length: durationHours }, (_, t) => {
    const progress = t / durationHours;
    let val = 1.0;

    if (style === "LINEAR") {
      val = 1.0;
    } else if (style === "EXPONENTIAL") {
      val = Math.exp(progress * 3);
    } else if (style === "S_CURVE") {
      val = 1 / (1 + Math.exp(-6 * (progress - 0.5)));
    } else if (style === "BELL_CURVE") {
      val = Math.exp(-Math.pow((progress - 0.5) / 0.2, 2));
    } else if (style === "LOGARITHMIC") {
      val = Math.log(1 + 9 * progress);
    } else if (style === "QUADRATIC") {
      val = Math.pow(progress, 2) + 0.1;
    } else if (style === "CUBIC") {
      val = Math.pow(progress, 3) + 0.05;
    } else if (style === "SINE_WAVE") {
      val = 1.0 + 0.5 * Math.sin(progress * 4 * Math.PI);
    } else if (style === "COSINE_WAVE") {
      val = 1.0 + 0.5 * Math.cos(progress * 4 * Math.PI);
    } else if (style === "SAWTOOTH") {
      const period = Math.max(1, Math.floor(durationHours / 4));
      val = (t % period) / period + 0.1;
    } else if (style === "CHAOTIC") {
      val = 0.5 + 0.3 * Math.sin(progress * 6 * Math.PI) + 0.2 * Math.sin(progress * 14 * Math.PI + 1.0) + 0.1 * Math.cos(progress * 22 * Math.PI);
    } else if (style === "DOUBLE_BELL") {
      val = Math.exp(-Math.pow((progress - 0.25) / 0.1, 2)) + Math.exp(-Math.pow((progress - 0.75) / 0.1, 2)) + 0.05;
    } else if (style === "STEP_LADDER") {
      val = Math.floor(progress * 4) / 4 + 0.1;
    } else if (style === "ALTERNATING") {
      val = (Math.floor(t) % 2 === 0) ? 1.0 : 0.05;
    } else if (style === "FIBONACCI") {
      val = Math.pow(1.618, progress * 8);
    } else if (style === "PARETO") {
      val = Math.pow(1 - progress, 4) + 0.02;
    } else if (style === "MORNING_SURGE") {
      val = Math.exp(-Math.pow((progress - 0.15) / 0.1, 2));
    } else if (style === "NOON_PEAK") {
      val = Math.exp(-Math.pow((progress - 0.5) / 0.15, 2));
    } else if (style === "EVENING_BLAST") {
      val = Math.exp(-Math.pow((progress - 0.8) / 0.15, 2));
    } else if (style === "SIGMOID_DECAY") {
      val = 1 / (1 + Math.exp(10 * (progress - 0.85)));
    } else if (style === "STEEP_WARMUP") {
      val = (progress < 0.1) ? (progress / 0.1) : 1.0;
    } else {
      const r = RATES_MAP[style] ?? 0.8;
      const t0 = warmupHours + peakHours / 2;
      let logistic = 1 / (1 + Math.exp(-r * (t - t0)));

      if (style === "CLIPSTAKE") {
        logistic = logistic * (progress < 0.35 ? 0.4 : progress < 0.7 ? 0.75 : 1.0);
      } else if (style === "CROSSWAVE") {
        logistic = logistic * (1 + 0.3 * Math.sin((t * Math.PI) / 4));
      } else if (style === "WHOP") {
        logistic = Math.pow(logistic, 1.5);
      } else if (style === "CLIPSTAR") {
        logistic = Math.sqrt(logistic);
      } else if (style === "PICSART") {
        logistic = Math.pow(logistic, 1.2);
      }
      val = logistic;
    }

    const utcHour = (nowUtcHour + t) % 24;
    return val * peakHourMultiplier(utcHour, tzOffsetHours);
  });

  const sum = raw.reduce((a, b) => a + b, 0);
  let distributed = raw.map((v) => Math.max(0, Math.round((v / sum) * totalViews)));

  // Enforce SMM minimum limit of 100 views per batch by merging smaller batches
  const SMM_MIN = 100;
  if (totalViews >= SMM_MIN) {
    while (true) {
      const underMinIdx = distributed.findIndex((v) => v > 0 && v < SMM_MIN);
      if (underMinIdx === -1) break;

      const val = distributed[underMinIdx];
      distributed[underMinIdx] = 0;

      let targetIdx = -1;
      const leftIdx = underMinIdx - 1;
      const rightIdx = underMinIdx + 1;

      if (leftIdx >= 0 && rightIdx < distributed.length) {
        targetIdx = distributed[leftIdx] >= distributed[rightIdx] ? leftIdx : rightIdx;
      } else if (leftIdx >= 0) {
        targetIdx = leftIdx;
      } else if (rightIdx < distributed.length) {
        targetIdx = rightIdx;
      }

      if (targetIdx !== -1) {
        distributed[targetIdx] += val;
      } else {
        distributed[underMinIdx] = val;
        break;
      }
    }
  }

  // Fix rounding drift
  const actual = distributed.reduce((a, b) => a + b, 0);
  const diff = totalViews - actual;
  if (diff !== 0) {
    const lastNonZero = distributed.reduceRight((found, v, i) => found === -1 && v > 0 ? i : found, -1);
    if (lastNonZero >= 0) distributed[lastNonZero] = Math.max(0, distributed[lastNonZero] + diff);
  }

  return distributed
    .map((views, hour) => {
      const ratio = totalViews > 0 ? views / totalViews : 0;
      return {
        hour,
        scheduledDelayMs: hour * 60 * 60 * 1000,
        views,
        likes:    engagementEnabled ? Math.round((likesRatioPct    / 100) * totalViews * ratio) : 0,
        saves:    engagementEnabled ? Math.round((savesRatioPct    / 100) * totalViews * ratio) : 0,
        shares:   engagementEnabled ? Math.round((sharesRatioPct   / 100) * totalViews * ratio) : 0,
        comments: engagementEnabled ? Math.round((commentsRatioPct / 100) * totalViews * ratio) : 0,
      };
    })
    .filter((b) => b.views > 0);
}

/**
 * Chart-only data: {hour, views, likes, saves, shares}[] per hour.
 */
export function curveForChart(params: CurveParams): {
  hour: number; views: number; likes: number; saves: number; shares: number;
}[] {
  return generateDeliverySchedule(params).map(({ hour, views, likes, saves, shares }) => ({
    hour, views, likes, saves, shares,
  }));
}

/**
 * Calculate total engagement targets from views count + ratios.
 */
export function calculateEngagementTargets(
  totalViews: number,
  likesRatioPct: number,
  savesRatioPct: number,
  sharesRatioPct: number,
  commentsRatioPct: number,
) {
  return {
    likesTarget:    Math.round((likesRatioPct    / 100) * totalViews),
    savesTarget:    Math.round((savesRatioPct    / 100) * totalViews),
    sharesTarget:   Math.round((sharesRatioPct   / 100) * totalViews),
    commentsTarget: Math.round((commentsRatioPct / 100) * totalViews),
  };
}

// ─────────────────────────────────────────────────────────────
// ENGAGEMENT ACCUMULATION SYSTEM
// ─────────────────────────────────────────────────────────────
//
// Problem: 10K views / 30 days, 4% likes = 400 likes / 720 ticks
//          = 0.55 likes/tick → panels reject sub-minimum orders
//          → Can't place 720 tiny engagement orders (spam-detected)
//
// Solution: "Owed vs Delivered" accumulation
//   - After each views tick, calculate how many likes are NOW OWED
//     based on the fraction of views delivered so far
//   - Subtract already-delivered likes
//   - Only fire an engagement order when the ACCUMULATED DUE amount
//     reaches the panel's minimum threshold
//   - This batches small engagements naturally into organic-timed bursts
//
// Example: 10K views / 30 days, 4% likes, min threshold = 10
//   Hour 1:  140 views delivered (1.4%) → owed = 1.4% × 400 = 5.6 → due = 5  → skip (< 10)
//   Hour 2:  280 views delivered (2.8%) → owed = 2.8% × 400 = 11.2 → due = 11 → FIRE 11 likes! ✓
//   Hour 3:  420 views delivered (4.2%) → owed = 4.2% × 400 = 16.8 → due = 5.8 → skip
//   ...and so on — likes fire every ~2 hours naturally instead of every hour
//
// For LARGE campaigns (100K+ views), owed/tick is already large enough
// that every tick fires — no accumulation needed, same as before.
// ─────────────────────────────────────────────────────────────

export interface EngagementDue {
  likes: number;
  saves: number;
  shares: number;
  comments: number;
}

/**
 * Calculates how much engagement to send on THIS tick using the
 * "owed vs delivered" accumulation algorithm.
 *
 * @param viewsTarget        - Total views planned for this campaign
 * @param viewsDeliveredNow  - Views delivered AFTER this tick (including current batch)
 * @param targets            - Total engagement targets for full campaign
 * @param alreadyDelivered   - Engagement already sent before this tick
 * @param minBatchSize       - Minimum panel order quantity (default: 10)
 * @returns Quantities to send NOW for each engagement type (0 = skip this tick)
 */
export function calculateEngagementDue(
  viewsTarget: number,
  viewsDeliveredNow: number,
  targets: { likes: number; saves: number; shares: number; comments: number },
  alreadyDelivered: { likes: number; saves: number; shares: number; comments: number },
  minBatchSize = 10,
): EngagementDue {
  if (viewsTarget <= 0) return { likes: 0, saves: 0, shares: 0, comments: 0 };

  // Fraction of campaign complete after this views tick
  const fraction = Math.min(1, viewsDeliveredNow / viewsTarget);

  // How much engagement is NOW owed based on views progress
  const owed = {
    likes:    Math.round(targets.likes    * fraction),
    saves:    Math.round(targets.saves    * fraction),
    shares:   Math.round(targets.shares   * fraction),
    comments: Math.round(targets.comments * fraction),
  };

  // How much is still due (owed minus already sent)
  const due = {
    likes:    Math.max(0, owed.likes    - alreadyDelivered.likes),
    saves:    Math.max(0, owed.saves    - alreadyDelivered.saves),
    shares:   Math.max(0, owed.shares   - alreadyDelivered.shares),
    comments: Math.max(0, owed.comments - alreadyDelivered.comments),
  };

  // Only fire if due amount meets minimum threshold
  // (or it's the LAST batch of the campaign — flush remainder)
  const isLastBatch = fraction >= 0.99;

  return {
    likes:    (due.likes    >= minBatchSize || (isLastBatch && due.likes    > 0)) ? due.likes    : 0,
    saves:    (due.saves    >= minBatchSize || (isLastBatch && due.saves    > 0)) ? due.saves    : 0,
    shares:   (due.shares   >= minBatchSize || (isLastBatch && due.shares   > 0)) ? due.shares   : 0,
    comments: (due.comments >= minBatchSize || (isLastBatch && due.comments > 0)) ? due.comments : 0,
  };
}
