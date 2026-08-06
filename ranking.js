(() => {
  'use strict';

  const config = Object.freeze({
    minimum: 0,
    maximum: 100,
    seriesStep: 4,
    ratingScale: 40,
    sweepMultiplier: 1.25
  });

  function clamp(value, minimum = config.minimum, maximum = config.maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function roundOne(value) {
    return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  }

  function expectedScore(rating, opponentRating) {
    return 1 / (1 + (10 ** ((opponentRating - rating) / config.ratingScale)));
  }

  function seriesDelta(winnerRating, loserRating, loserMapWins) {
    const winner = clamp(winnerRating);
    const loser = clamp(loserRating);
    const multiplier = Number(loserMapWins) === 0 ? config.sweepMultiplier : 1;
    const rawDelta = config.seriesStep * (1 - expectedScore(winner, loser)) * multiplier;
    const availableTenths = Math.max(0, Math.floor(Math.min(config.maximum - winner, loser - config.minimum) * 10));
    const deltaTenths = Math.min(Math.round(rawDelta * 10), availableTenths);
    return deltaTenths / 10;
  }

  function applySeries(winnerRating, loserRating, loserMapWins) {
    const delta = seriesDelta(winnerRating, loserRating, loserMapWins);
    return {
      winner: roundOne(clamp(winnerRating + delta)),
      loser: roundOne(clamp(loserRating - delta)),
      delta
    };
  }

  function tierForScore(score) {
    if (score >= 85) return 'S';
    if (score >= 82) return 'A+';
    if (score >= 79) return 'A';
    if (score >= 75) return 'B';
    return 'C';
  }

  function stateForScore(score) {
    if (score >= 82) return 'hot';
    if (score >= 75) return 'stable';
    return 'unknown';
  }

  window.RL_RANKING = Object.freeze({
    config,
    applySeries,
    expectedScore,
    roundOne,
    tierForScore,
    stateForScore
  });
})();
