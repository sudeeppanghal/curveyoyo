import { CURVE_100_MAP } from "../src/lib/delivery/curve-styles-100";

function generateRawScheduleFix(params: any) {
  const {
    totalViews, durationHours, style,
    minQuantity = 100,
  } = params;

  const config = CURVE_100_MAP[style];
  
  // Calculate interval
  const minBatchViews = 150;
  const maxSteps = Math.max(1, Math.floor(totalViews / minBatchViews));
  const idealInterval = (durationHours * 60) / maxSteps;
  const options = [15, 30, 60, 120, 240, 360, 720, 1440];
  const snapped = options.find((opt) => opt >= idealInterval) ?? 1440;
  
  let intervalMins = 60;
  const avgViewsPerHour = totalViews / durationHours;
  if (avgViewsPerHour >= 400) {
    intervalMins = Math.min(snapped, 15);
  } else if (avgViewsPerHour >= 200) {
    intervalMins = Math.min(snapped, 30);
  } else {
    intervalMins = Math.max(snapped, 60);
  }

  const stepsPerHour = 60 / intervalMins;
  const totalSteps = Math.max(1, durationHours * stepsPerHour);

  // 1. Evaluate baseline at p = 0
  const baseline = config && config.evalCurve ? config.evalCurve(0, 0, totalSteps) : 1 / (1 + Math.exp(-6 * (-0.45)));

  // 2. Evaluate curve values at each step (using progress at end of step)
  const curveVals = Array.from({ length: totalSteps }, (_, t) => {
    const progress = (t + 1) / totalSteps;
    if (config && config.evalCurve) {
      return config.evalCurve(t + 1, progress, totalSteps);
    }
    return 1 / (1 + Math.exp(-6 * (progress - 0.45)));
  });

  // 3. Check if cumulative (using the robust decreasing steps check)
  let isCumulative = true;
  let decreases = 0;
  for (let t = 1; t < totalSteps; t++) {
    if (curveVals[t] < curveVals[t - 1]) {
      decreases++;
      if (decreases > 2) {
        isCumulative = false;
        break;
      }
    }
  }

  // 4. Calculate raw weights
  const raw = Array.from({ length: totalSteps }, (_, t) => {
    let val = 1.0;
    if (isCumulative) {
      const prevVal = t > 0 ? curveVals[t - 1] : baseline;
      val = Math.max(0, curveVals[t] - prevVal);
    } else {
      val = curveVals[t];
    }
    return val;
  });

  const sum = raw.reduce((a, b) => a + b, 0);

  let viewsAccumulated = 0;
  const distributedViews: number[] = [];

  for (let t = 0; t < totalSteps; t++) {
    const theoreticalViewsProgress = sum > 0 ? raw[t] / sum : 0;
    const targetViewsForStep = totalViews * theoreticalViewsProgress;
    let roundedViews = Math.round(targetViewsForStep);
    
    const remainingViews = totalViews - viewsAccumulated;
    if (t === totalSteps - 1) {
      roundedViews = remainingViews;
    } else {
      roundedViews = Math.min(remainingViews, roundedViews);
    }
    roundedViews = Math.max(0, roundedViews);
    viewsAccumulated += roundedViews;
    distributedViews.push(roundedViews);
  }

  return {
    isCumulative,
    batches: distributedViews.map((views, stepIdx) => ({
      hour: stepIdx / stepsPerHour,
      views,
    })).filter(b => b.views > 0),
  };
}

function test() {
  const params = {
    totalViews: 45000,
    durationHours: 24,
    style: "ORGANIC",
  };

  const styles = ["ORGANIC", "FAST", "AGGRESSIVE", "SLOW_START", "STEADY_CLIMB"];
  for (const style of styles) {
    console.log(`\n=== Style: ${style} ===`);
    const res = generateRawScheduleFix({ ...params, style });
    console.log(`Is Cumulative: ${res.isCumulative}`);
    console.log(`Total non-zero batches: ${res.batches.length}`);
    console.log(res.batches.slice(0, 5));
  }
}

test();
