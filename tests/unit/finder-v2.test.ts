import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCandidate,
  deriveProfile,
  candidateProfile,
  explain,
  matchPercent,
  resolveWeights,
  DEFAULT_FINDER_WEIGHTS,
  type FinderCandidate,
} from '@/lib/finder/scoring';

const n = (slug: string, name = slug) => ({ slug, name });

const blanc: FinderCandidate = {
  gender: 'MEN', season: 'SUMMER', familySlug: 'fresh', sillage: 3, longevity: 3,
  occasions: ['DAILY', 'WORK'],
  notes: [n('bergamot', 'برغموت'), n('lemon', 'ليمون'), n('mint', 'نعناع'), n('marine', 'بحري'), n('cedar'), n('musk')],
};
const intense: FinderCandidate = {
  gender: 'MEN', season: 'ALL_YEAR', familySlug: 'woody', sillage: 5, longevity: 5,
  occasions: ['EVENING', 'SPECIAL'],
  notes: [n('pepper'), n('cardamom'), n('leather'), n('oud', 'عود'), n('vanilla', 'فانيليا'), n('amber', 'عنبر')],
};

test('derived profile: citrus/marine reads fresh, vanilla/amber reads sweet', () => {
  const b = deriveProfile(blanc);
  const i = deriveProfile(intense);
  assert.ok(b.freshness >= 4, `blanc freshness ${b.freshness}`);
  assert.ok(i.sweetness >= 3, `intense sweetness ${i.sweetness}`);
  assert.ok(b.sweetness < i.sweetness);
  assert.ok(b.freshness > i.freshness);
});

test('profile values are always within 1..5', () => {
  const p = deriveProfile({ notes: Array.from({ length: 20 }, () => n('vanilla')), familySlug: 'oriental' });
  assert.equal(p.sweetness, 5);
  assert.equal(deriveProfile({ notes: [], familySlug: null }).freshness, 1);
});

test('admin-set freshness overrides the derived value', () => {
  assert.equal(candidateProfile({ ...intense, freshness: 5 }).freshness, 5);
  assert.equal(candidateProfile(intense).intensity, 5);
});

test('fresh + daily answers rank BLANC above INTENSE with an explainable sentence', () => {
  const answers = { freshness: 5, sweetness: 1, occasion: 'DAILY' as const, notes: ['bergamot'] };
  const a = scoreCandidate(blanc, answers);
  const b = scoreCandidate(intense, answers);
  assert.ok(a.score > b.score, `${a.score} vs ${b.score}`);
  const s = explain(a.phrases);
  assert.match(s, /^اخترنا لك هذا العطر لأنه /);
  assert.match(s, /الاستخدام اليومي/);
  assert.match(s, /برغموت/);
});

test('strong + sweet + evening answers rank INTENSE first', () => {
  const answers = { intensity: 5, sweetness: 5, occasion: 'EVENING' as const };
  assert.ok(scoreCandidate(intense, answers).score > scoreCandidate(blanc, answers).score);
});

test('preferred notes give partial credit per hit', () => {
  const one = scoreCandidate(intense, { notes: ['oud', 'rose'] }).score;
  const two = scoreCandidate(intense, { notes: ['oud', 'vanilla'] }).score;
  const none = scoreCandidate(intense, { notes: ['rose', 'jasmine'] }).score;
  assert.ok(two > one && one > none);
  assert.equal(none, 0);
});

test('matchPercent is honest (null when nothing answered)', () => {
  assert.equal(matchPercent(0, 0), null);
  assert.equal(matchPercent(3, 4), 75);
  const r = scoreCandidate(blanc, {});
  assert.equal(r.maxScore, 0);
});

test('explain falls back gracefully and joins with Arabic conjunction', () => {
  assert.match(explain([]), /اخترناه لك/);
  assert.equal(explain(['أ', 'ب']), 'اخترنا لك هذا العطر لأنه أ وب.');
});

test('resolveWeights accepts the new dimensions and rejects negatives', () => {
  const w = resolveWeights({ notes: 4, freshness: -1 });
  assert.equal(w.notes, 4);
  assert.equal(w.freshness, DEFAULT_FINDER_WEIGHTS.freshness);
});
