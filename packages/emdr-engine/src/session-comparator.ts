/**
 * Session Comparator
 *
 * Compares EMDR sessions to track therapeutic progress over time.
 * Produces session-to-session deltas, multi-session trends, and
 * human-readable progress summaries.
 */

import type {
  FullSessionExport,
  ProgressSummary,
  SessionComparison,
  TrendAnalysis,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;

const firstValue = (records: { value: number }[]): number =>
  records.length > 0 ? records[0].value : 0;

const lastValue = (records: { value: number }[]): number =>
  records.length > 0 ? records[records.length - 1].value : 0;

// ---------------------------------------------------------------------------
// SessionComparator
// ---------------------------------------------------------------------------

export class SessionComparator {
  /**
   * Compare two sessions and produce a detailed delta report.
   */
  compare(
    current: FullSessionExport,
    previous: FullSessionExport
  ): SessionComparison {
    const sudsDelta =
      lastValue(current.sudsHistory) - lastValue(previous.sudsHistory);
    const vocDelta =
      lastValue(current.vocHistory) - lastValue(previous.vocHistory);

    const avgStressCurrent = avg(current.emotionTrack.map((e) => e.stress));
    const avgStressPrevious = avg(previous.emotionTrack.map((e) => e.stress));
    const avgStressDelta = avgStressCurrent - avgStressPrevious;

    const avgEngCurrent = avg(current.emotionTrack.map((e) => e.engagement));
    const avgEngPrevious = avg(previous.emotionTrack.map((e) => e.engagement));
    const avgEngagementDelta = avgEngCurrent - avgEngPrevious;

    const improvements: string[] = [];
    const concerns: string[] = [];

    if (sudsDelta < 0)
      improvements.push(`SUDS decreased by ${Math.abs(sudsDelta)}`);
    if (sudsDelta > 0) concerns.push(`SUDS increased by ${sudsDelta}`);

    if (vocDelta > 0)
      improvements.push(`VOC improved by ${vocDelta}`);
    if (vocDelta < 0) concerns.push(`VOC declined by ${Math.abs(vocDelta)}`);

    if (avgStressDelta < -0.05)
      improvements.push('Average stress decreased');
    if (avgStressDelta > 0.05) concerns.push('Average stress increased');

    if (avgEngagementDelta > 0.05)
      improvements.push('Engagement improved');
    if (avgEngagementDelta < -0.05) concerns.push('Engagement decreased');

    if (current.safetyEvents.length < previous.safetyEvents.length)
      improvements.push('Fewer safety events');
    if (current.safetyEvents.length > previous.safetyEvents.length)
      concerns.push('More safety events than previous session');

    const comparison: SessionComparison = {
      currentSessionId: current.sessionId,
      previousSessionId: previous.sessionId,
      sudsDelta,
      vocDelta,
      avgStressDelta: Math.round(avgStressDelta * 1000) / 1000,
      avgEngagementDelta: Math.round(avgEngagementDelta * 1000) / 1000,
      effectivenessScore: 0,
      improvements,
      concerns,
    };

    comparison.effectivenessScore =
      this.calculateEffectivenessScore(comparison);

    return comparison;
  }

  /**
   * Weighted effectiveness score from a comparison (0-1).
   */
  calculateEffectivenessScore(comparison: SessionComparison): number {
    let score = 0.5; // neutral baseline

    // SUDS improvement (negative delta is good) — weight 0.35
    const sudsContrib = Math.max(-1, Math.min(1, -comparison.sudsDelta / 10));
    score += sudsContrib * 0.35;

    // VOC improvement (positive delta is good) — weight 0.25
    const vocContrib = Math.max(-1, Math.min(1, comparison.vocDelta / 6));
    score += vocContrib * 0.25;

    // Stress reduction — weight 0.2
    const stressContrib = Math.max(
      -1,
      Math.min(1, -comparison.avgStressDelta / 0.5)
    );
    score += stressContrib * 0.2;

    // Engagement improvement — weight 0.1
    const engContrib = Math.max(
      -1,
      Math.min(1, comparison.avgEngagementDelta / 0.5)
    );
    score += engContrib * 0.1;

    // Concerns penalty — weight 0.1
    const concernPenalty = Math.min(1, comparison.concerns.length / 4);
    score -= concernPenalty * 0.1;

    return Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;
  }

  /**
   * Generate a human-readable summary from multiple sessions.
   */
  generateProgressSummary(sessions: FullSessionExport[]): ProgressSummary {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        avgSudsDrop: 0,
        avgVocGain: 0,
        overallEffectiveness: 0,
        sessionsWithSafetyEvents: 0,
        completionRate: 0,
        summary: 'No sessions to summarize.',
      };
    }

    const sudsDrops: number[] = [];
    const vocGains: number[] = [];
    let completedCount = 0;
    let safetyCount = 0;

    for (const session of sessions) {
      if (session.sudsHistory.length >= 2) {
        sudsDrops.push(
          firstValue(session.sudsHistory) - lastValue(session.sudsHistory)
        );
      }
      if (session.vocHistory.length >= 2) {
        vocGains.push(
          lastValue(session.vocHistory) - firstValue(session.vocHistory)
        );
      }
      if (session.closureTechnique) completedCount++;
      if (session.safetyEvents.length > 0) safetyCount++;
    }

    const avgSudsDrop = Math.round(avg(sudsDrops) * 100) / 100;
    const avgVocGain = Math.round(avg(vocGains) * 100) / 100;
    const completionRate =
      Math.round((completedCount / sessions.length) * 100) / 100;

    // Simple overall effectiveness
    const sudsScore = sudsDrops.length > 0 ? Math.max(0, avgSudsDrop / 10) : 0;
    const vocScore = vocGains.length > 0 ? Math.max(0, avgVocGain / 6) : 0;
    const overallEffectiveness =
      Math.round(((sudsScore * 0.5 + vocScore * 0.3 + completionRate * 0.2)) * 100) / 100;

    const parts: string[] = [
      `Across ${sessions.length} session(s):`,
    ];
    if (sudsDrops.length > 0)
      parts.push(`average SUDS reduction of ${avgSudsDrop.toFixed(1)}`);
    if (vocGains.length > 0)
      parts.push(`average VOC gain of ${avgVocGain.toFixed(1)}`);
    parts.push(`${completedCount} completed (${(completionRate * 100).toFixed(0)}%)`);
    if (safetyCount > 0)
      parts.push(`${safetyCount} session(s) with safety events`);

    return {
      totalSessions: sessions.length,
      avgSudsDrop,
      avgVocGain,
      overallEffectiveness,
      sessionsWithSafetyEvents: safetyCount,
      completionRate,
      summary: parts.join('. ') + '.',
    };
  }

  /**
   * Identify trends across chronologically ordered sessions.
   */
  identifyTrends(sessions: FullSessionExport[]): TrendAnalysis {
    const sudsOverTime = sessions.map((s) => ({
      sessionId: s.sessionId,
      startSuds: firstValue(s.sudsHistory),
      endSuds: lastValue(s.sudsHistory),
    }));

    const vocOverTime = sessions.map((s) => ({
      sessionId: s.sessionId,
      startVoc: firstValue(s.vocHistory),
      endVoc: lastValue(s.vocHistory),
    }));

    const stressOverTime = sessions.map((s) => ({
      sessionId: s.sessionId,
      avgStress: avg(s.emotionTrack.map((e) => e.stress)),
    }));

    // Simple linear trend via end-SUDS comparison across sessions
    let direction: 'improving' | 'stable' | 'declining' = 'stable';
    let confidence = 0;

    if (sessions.length >= 2) {
      const endSudsValues = sudsOverTime.map((s) => s.endSuds);
      const firstEnd = endSudsValues[0];
      const lastEnd = endSudsValues[endSudsValues.length - 1];
      const delta = lastEnd - firstEnd;

      if (delta < -1) {
        direction = 'improving';
        confidence = Math.min(1, Math.abs(delta) / 5);
      } else if (delta > 1) {
        direction = 'declining';
        confidence = Math.min(1, Math.abs(delta) / 5);
      } else {
        direction = 'stable';
        confidence = 1 - Math.abs(delta) / 2;
      }

      confidence = Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100;
    }

    return {
      sudsOverTime,
      vocOverTime,
      stressOverTime,
      direction,
      confidence,
    };
  }
}
