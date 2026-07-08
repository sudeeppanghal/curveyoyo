// ─────────────────────────────────────────────────────────────
// S-Curve Delivery Engine — Views + Engagement + Peak-Hour
// Logistic: V(t) = K / (1 + e^(-r(t - t0)))
// ─────────────────────────────────────────────────────────────

import { CURVE_100_MAP } from "./curve-styles-100";

export interface CurveParams {
  totalViews: number;
  durationHours: number;
  warmupHours: number;
  peakHours: number;
  style: string;
  // Engagement
  engagementEnabled?: boolean;
  likesRatioPct?: number;
  savesRatioPct?: number;
  sharesRatioPct?: number;
  commentsRatioPct?: number;
  repostsRatioPct?: number;
  // Timezone offset from UTC in hours (e.g. +5.5 for IST)
  tzOffsetHours?: number;
  intervalMinutes?: number;
  minQuantity?: number;
}

export interface DeliveryBatch {
  hour: number;
  scheduledDelayMs: number;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
  reposts: number;
  scheduledTime?: string;
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
  CROSSWAVE:       0.9,
  VYRO:            1.6,
  CLIPPING_NET:    1.1,
  CONTENT_REWARDS: 0.85,
  PROMOTE_FUN:     2.2,
  CLIP_AFFILIATES: 0.75,
  OVERLAP_AI:      0.6,
  GENNI:           1.3,
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
export function generateRawSchedule(params: CurveParams): DeliveryBatch[] {
  const {
    totalViews, durationHours, warmupHours, peakHours, style,
    engagementEnabled = true,
    likesRatioPct = 4.0, savesRatioPct = 2.0,
    sharesRatioPct = 0.5, commentsRatioPct = 0.2, repostsRatioPct = 0.0,
    tzOffsetHours = 5.5,
    intervalMinutes,
  } = params;

  const RATES_MAP: Record<string, number> = RATES;
  const nowUtcHour = new Date().getUTCHours();

  let intervalMins = intervalMinutes;
  if (!intervalMins) {
    const minBatchViews = 150; // target average views per batch to prevent merging flattening
    const maxSteps = Math.max(1, Math.floor(totalViews / minBatchViews));
    const idealInterval = (durationHours * 60) / maxSteps;
    
    // Snaps to standard intervals (15m, 30m, 1h, 2h, 4h, 6h, 12h, 24h)
    const options = [15, 30, 60, 120, 240, 360, 720, 1440];
    const snapped = options.find((opt) => opt >= idealInterval) ?? 1440;
    
    // Ensure high-volume campaigns don't get throttled to large intervals unnecessarily
    const avgViewsPerHour = totalViews / durationHours;
    if (avgViewsPerHour >= 400) {
      intervalMins = Math.min(snapped, 15);
    } else if (avgViewsPerHour >= 200) {
      intervalMins = Math.min(snapped, 30);
    } else {
      intervalMins = Math.max(snapped, 60);
    }
  }

  const stepsPerHour = 60 / intervalMins;
  const totalSteps = Math.max(1, durationHours * stepsPerHour);

  const config = CURVE_100_MAP[style];

  // 1. Evaluate baseline at p = 0
  const baseline = config && config.evalCurve ? config.evalCurve(0, 0, totalSteps) : 1 / (1 + Math.exp(-6 * (-0.45)));

  // 2. Evaluate the raw curve values at each step using progress at the end of the step interval
  const curveVals = Array.from({ length: totalSteps }, (_, t) => {
    const progress = (t + 1) / totalSteps;
    if (config && config.evalCurve) {
      return config.evalCurve(t + 1, progress, totalSteps);
    }
    return 1 / (1 + Math.exp(-6 * (progress - 0.45)));
  });

  // 3. Check if the curve is cumulative (strictly or mostly rising) by counting drops
  let isCumulative = true;
  let decreases = 0;
  for (let t = 1; t < totalSteps; t++) {
    if (curveVals[t] < curveVals[t - 1]) {
      decreases++;
      if (decreases > 2) { // allow minor noise/fluctuations, but classify smooth descents as non-cumulative
        isCumulative = false;
        break;
      }
    }
  }

  // 4. Calculate batch weights based on curve type
  const raw = Array.from({ length: totalSteps }, (_, t) => {
    const hourTime = t / stepsPerHour;
    let val = 1.0;

    if (isCumulative) {
      const prevVal = t > 0 ? curveVals[t - 1] : baseline;
      val = Math.max(0, curveVals[t] - prevVal);
    } else {
      val = curveVals[t];
    }

    const utcHour = (nowUtcHour + hourTime) % 24;
    const mult = (style === "ORGANIC") ? peakHourMultiplier(utcHour, tzOffsetHours) : 1.0;
    return val * mult;
  });

  const sum = raw.reduce((a, b) => a + b, 0);

  let viewsAccumulated = 0;
  let likesAccumulated = 0;
  let savesAccumulated = 0;
  let sharesAccumulated = 0;
  let commentsAccumulated = 0;
  let repostsAccumulated = 0;

  const distributedViews: number[] = [];
  const distributedLikes: number[] = [];
  const distributedSaves: number[] = [];
  const distributedShares: number[] = [];
  const distributedComments: number[] = [];
  const distributedReposts: number[] = [];

  for (let t = 0; t < totalSteps; t++) {
    // 1. Calculate theoretical views for this step
    const theoreticalViewsProgress = sum > 0 ? raw[t] / sum : 0;
    const targetViewsForStep = totalViews * theoreticalViewsProgress;

    // Apply random views jitter of ±12%
    let jitteredViews = targetViewsForStep;
    if (totalViews > 0 && t < totalSteps - 1) {
      const jitterFactor = 1 + (Math.random() * 2 - 1) * 0.12; // ±12%
      jitteredViews = targetViewsForStep * jitterFactor;
    }

    // Round to integer
    let roundedViews = Math.round(jitteredViews);
    
    // Adjust to not exceed remaining target
    const remainingViews = totalViews - viewsAccumulated;
    if (t === totalSteps - 1) {
      roundedViews = remainingViews;
    } else {
      roundedViews = Math.min(remainingViews, roundedViews);
    }
    roundedViews = Math.max(0, roundedViews);
    viewsAccumulated += roundedViews;
    distributedViews.push(roundedViews);

    // 2. Calculate engagement targets for this step using fraction-based accumulation
    const fraction = totalViews > 0 ? viewsAccumulated / totalViews : 0;

    // Overall targets
    const overallLikesTarget = engagementEnabled ? Math.round((likesRatioPct / 100) * totalViews) : 0;
    const overallSavesTarget = engagementEnabled ? Math.round((savesRatioPct / 100) * totalViews) : 0;
    const overallSharesTarget = engagementEnabled ? Math.round((sharesRatioPct / 100) * totalViews) : 0;
    const overallCommentsTarget = engagementEnabled ? Math.round((commentsRatioPct / 100) * totalViews) : 0;
    const overallRepostsTarget = engagementEnabled ? Math.round((repostsRatioPct / 100) * totalViews) : 0;

    // Owed (theoretical perfect amount by this point)
    const owedLikes = Math.round(overallLikesTarget * fraction);
    const owedSaves = Math.round(overallSavesTarget * fraction);
    const owedShares = Math.round(overallSharesTarget * fraction);
    const owedComments = Math.round(overallCommentsTarget * fraction);
    const owedReposts = Math.round(overallRepostsTarget * fraction);

    // Due (what we need to send to catch up)
    const dueLikes = Math.max(0, owedLikes - likesAccumulated);
    const dueSaves = Math.max(0, owedSaves - savesAccumulated);
    const dueShares = Math.max(0, owedShares - sharesAccumulated);
    const dueComments = Math.max(0, owedComments - commentsAccumulated);
    const dueReposts = Math.max(0, owedReposts - repostsAccumulated);

    // Apply jitter and round, then add to accumulated
    // Likes
    let roundedLikes = Math.round(dueLikes * (1 + (Math.random() * 2 - 1) * 0.15));
    if (t === totalSteps - 1) roundedLikes = overallLikesTarget - likesAccumulated;
    roundedLikes = Math.max(0, roundedLikes);
    likesAccumulated += roundedLikes;
    distributedLikes.push(roundedLikes);

    // Saves
    let roundedSaves = Math.round(dueSaves * (1 + (Math.random() * 2 - 1) * 0.15));
    if (t === totalSteps - 1) roundedSaves = overallSavesTarget - savesAccumulated;
    roundedSaves = Math.max(0, roundedSaves);
    savesAccumulated += roundedSaves;
    distributedSaves.push(roundedSaves);

    // Shares
    let roundedShares = Math.round(dueShares * (1 + (Math.random() * 2 - 1) * 0.15));
    if (t === totalSteps - 1) roundedShares = overallSharesTarget - sharesAccumulated;
    roundedShares = Math.max(0, roundedShares);
    sharesAccumulated += roundedShares;
    distributedShares.push(roundedShares);

    // Comments
    let roundedComments = Math.round(dueComments * (1 + (Math.random() * 2 - 1) * 0.15));
    if (t === totalSteps - 1) roundedComments = overallCommentsTarget - commentsAccumulated;
    roundedComments = Math.max(0, roundedComments);
    commentsAccumulated += roundedComments;
    distributedComments.push(roundedComments);

    // Reposts
    let roundedReposts = Math.round(dueReposts * (1 + (Math.random() * 2 - 1) * 0.15));
    if (t === totalSteps - 1) roundedReposts = overallRepostsTarget - repostsAccumulated;
    roundedReposts = Math.max(0, roundedReposts);
    repostsAccumulated += roundedReposts;
    distributedReposts.push(roundedReposts);
  }

  // Enforce SMM minimum limit (from AdminService or default 100) by merging smaller batches
  const SMM_MIN = Math.max(10, params.minQuantity || 100);
  if (totalViews >= SMM_MIN) {
    let loopCount = 0;
    while (loopCount++ < 1000) {
      const underMinIdx = distributedViews.findIndex((v) => v > 0 && v < SMM_MIN);
      if (underMinIdx === -1) break;

      const val = distributedViews[underMinIdx];
      distributedViews[underMinIdx] = 0;

      // Prefer merging into nearest existing non-zero neighbor to prevent ping-ponging between zeros
      let targetIdx = -1;
      let minDist = Infinity;
      for (let i = 0; i < distributedViews.length; i++) {
        if (i !== underMinIdx && distributedViews[i] > 0) {
          const dist = Math.abs(i - underMinIdx);
          if (dist < minDist) {
            minDist = dist;
            targetIdx = i;
          }
        }
      }

      // If no non-zero neighbor found, fall back to immediate neighbor
      if (targetIdx === -1) {
        const leftIdx = underMinIdx - 1;
        const rightIdx = underMinIdx + 1;
        if (leftIdx >= 0 && rightIdx < distributedViews.length) {
          targetIdx = distributedViews[leftIdx] >= distributedViews[rightIdx] ? leftIdx : rightIdx;
        } else if (leftIdx >= 0) {
          targetIdx = leftIdx;
        } else if (rightIdx < distributedViews.length) {
          targetIdx = rightIdx;
        }
      }

      if (targetIdx !== -1) {
        distributedViews[targetIdx] += val;
        // Merge corresponding engagement metrics to keep ratios accurate
        distributedLikes[targetIdx] += distributedLikes[underMinIdx];
        distributedSaves[targetIdx] += distributedSaves[underMinIdx];
        distributedShares[targetIdx] += distributedShares[underMinIdx];
        distributedComments[targetIdx] += distributedComments[underMinIdx];
        distributedReposts[targetIdx] += distributedReposts[underMinIdx];

        distributedLikes[underMinIdx] = 0;
        distributedSaves[underMinIdx] = 0;
        distributedShares[underMinIdx] = 0;
        distributedComments[underMinIdx] = 0;
        distributedReposts[underMinIdx] = 0;
      } else {
        distributedViews[underMinIdx] = val;
        break;
      }
    }
  }

  // Fix rounding drift for views
  const actualViews = distributedViews.reduce((a, b) => a + b, 0);
  const diffViews = totalViews - actualViews;
  if (diffViews !== 0) {
    const lastNonZero = distributedViews.reduceRight((found, v, i) => found === -1 && v > 0 ? i : found, -1);
    if (lastNonZero >= 0) distributedViews[lastNonZero] = Math.max(0, distributedViews[lastNonZero] + diffViews);
  }

  return distributedViews.map((views, stepIdx) => {
    const stepHourTime = stepIdx / stepsPerHour;
    return {
      hour: stepHourTime,
      scheduledDelayMs: stepIdx * intervalMins * 60 * 1000,
      views,
      likes: distributedLikes[stepIdx],
      saves: distributedSaves[stepIdx],
      shares: distributedShares[stepIdx],
      comments: distributedComments[stepIdx],
      reposts: distributedReposts[stepIdx],
    };
  });
}

export function generateDeliverySchedule(params: CurveParams): DeliveryBatch[] {
  return generateRawSchedule(params).filter((b) => b.views > 0);
}

/**
 * Chart-only data: {hour, views, likes, saves, shares, reposts}[] per hour.
 */
export function curveForChart(params: CurveParams): {
  hour: number; views: number; likes: number; saves: number; shares: number; reposts: number;
}[] {
  return generateDeliverySchedule(params).map(({ hour, views, likes, saves, shares, reposts }) => ({
    hour, views, likes, saves, shares, reposts,
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
  repostsRatioPct: number = 0.0,
) {
  const likesRaw = Math.round((likesRatioPct / 100) * totalViews);
  const savesRaw = Math.round((savesRatioPct / 100) * totalViews);
  const sharesRaw = Math.round((sharesRatioPct / 100) * totalViews);
  const commentsRaw = Math.round((commentsRatioPct / 100) * totalViews);
  const repostsRaw = Math.round((repostsRatioPct / 100) * totalViews);

  return {
    likesTarget:    likesRaw > 0 ? Math.max(10, likesRaw) : 0,
    savesTarget:    savesRaw > 0 ? Math.max(10, savesRaw) : 0,
    sharesTarget:   sharesRaw > 0 ? Math.max(10, sharesRaw) : 0,
    commentsTarget: commentsRaw > 0 ? Math.max(5, commentsRaw) : 0,
    repostsTarget:  repostsRaw > 0 ? Math.max(10, repostsRaw) : 0,
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
  reposts: number;
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
  targets: { likes: number; saves: number; shares: number; comments: number; reposts: number; },
  alreadyDelivered: { likes: number; saves: number; shares: number; comments: number; reposts: number; },
  minBatchSizes: { likes: number; saves: number; shares: number; comments: number; reposts: number; } = { likes: 10, saves: 10, shares: 10, comments: 5, reposts: 10 },
): EngagementDue {
  if (viewsTarget <= 0) return { likes: 0, saves: 0, shares: 0, comments: 0, reposts: 0 };

  // Fraction of campaign complete after this views tick
  const fraction = Math.min(1, viewsDeliveredNow / viewsTarget);

  // How much engagement is NOW owed based on views progress
  const owed = {
    likes:    Math.round(targets.likes    * fraction),
    saves:    Math.round(targets.saves    * fraction),
    shares:   Math.round(targets.shares   * fraction),
    comments: Math.round(targets.comments * fraction),
    reposts:  Math.round(targets.reposts  * fraction),
  };

  // How much is still due (owed minus already sent)
  const due = {
    likes:    Math.max(0, owed.likes    - alreadyDelivered.likes),
    saves:    Math.max(0, owed.saves    - alreadyDelivered.saves),
    shares:   Math.max(0, owed.shares   - alreadyDelivered.shares),
    comments: Math.max(0, owed.comments - alreadyDelivered.comments),
    reposts:  Math.max(0, owed.reposts  - alreadyDelivered.reposts),
  };

  // Only fire if due amount meets the specific SMM service minimum threshold
  // (or it's the LAST batch of the campaign — flush remainder ONLY IF total target >= min threshold)
  const isLastBatch = fraction >= 0.99;

  const minLikes = minBatchSizes.likes;
  const minSaves = minBatchSizes.saves;
  const minShares = minBatchSizes.shares;
  const minComments = minBatchSizes.comments;
  const minReposts = minBatchSizes.reposts;

  return {
    likes:    targets.likes    > 0 ? Math.max(0, due.likes    >= minLikes    || (isLastBatch && due.likes    > 0) ? due.likes    : 0) : 0,
    saves:    targets.saves    > 0 ? Math.max(0, due.saves    >= minSaves    || (isLastBatch && due.saves    > 0) ? due.saves    : 0) : 0,
    shares:   targets.shares   > 0 ? Math.max(0, due.shares   >= minShares   || (isLastBatch && due.shares   > 0) ? due.shares   : 0) : 0,
    comments: targets.comments > 0 ? Math.max(0, due.comments >= minComments || (isLastBatch && due.comments > 0) ? due.comments : 0) : 0,
    reposts:  targets.reposts  > 0 ? Math.max(0, due.reposts  >= minReposts  || (isLastBatch && due.reposts  > 0) ? due.reposts  : 0) : 0,
  };
}
