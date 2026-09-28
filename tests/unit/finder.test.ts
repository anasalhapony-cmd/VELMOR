import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCandidate,
  resolveWeights,
  DEFAULT_FINDER_WEIGHTS,
  type FinderCandidate,
} from '@/lib/finder/scoring';

const oud: FinderCandidate = {
  gender: 'UNISEX',
  season: 'WINTER',
  familySlug: 'oriental',
  sillage: 5,
  longevity: 5,
  occasions: ['SPECIAL', 'EVENING'],
};

const blanc: FinderCandidate = {
  gender: 'MEN',
  season: 'SUMMER',
  familySlug: 'fresh',
  sillage: 3,
  longevity: 3,
  occasions: ['DAILY', 'WORK'],
};

test('a perfect match scores full marks on answered dimensions', () => {
  const r = scoreCandidate(
    blanc,
    { gender: 'MEN', season: 'SUMMER', families: ['fresh'], occasion: 'DAILY', sillage: 3, longevity: 3 },
    DEFAULT_FINDER_WEIGHTS
  );
  assert.equal(r.score, r.maxScore);
  assert.ok(r.maxScore > 0);
  assert.ok(r.reasons.length >= 4);
});

test('maxScore counts only answered dimensions', () => {
  const r = scoreCandidate(oud, { gender: 'MEN' }, DEFAULT_FINDER_WEIGHTS);
  assert.equal(r.maxScore, DEFAULT_FINDER_WEIGHTS.gender);
  // unisex fits a men request -> full gender points
  assert.equal(r.score, DEFAULT_FINDER_WEIGHTS.gender);
});

test('winter oud beats summer blanc for a winter/oriental request', () => {
  const answers = { season: 'WINTER' as const, families: ['oriental'], sillage: 5 };
  const oudScore = scoreCandidate(oud, answers).score;
  const blancScore = scoreCandidate(blanc, answers).score;
  assert.ok(oudScore > blancScore, `oud ${oudScore} should beat blanc ${blancScore}`);
});

test('sillage closeness is partial-credit, not binary', () => {
  const near = scoreCandidate(oud, { sillage: 4 }).score; // |5-4|/4 -> 0.75
  const far = scoreCandidate(oud, { sillage: 1 }).score; //  |5-1|/4 -> 0
  assert.ok(near > far);
  assert.equal(far, 0);
});

test('resolveWeights falls back to defaults for bad input', () => {
  assert.deepEqual(resolveWeights(null), DEFAULT_FINDER_WEIGHTS);
  assert.deepEqual(resolveWeights('nope'), DEFAULT_FINDER_WEIGHTS);
  assert.equal(resolveWeights({ gender: 10 }).gender, 10);
  assert.equal(resolveWeights({ gender: 'x' }).gender, DEFAULT_FINDER_WEIGHTS.gender);
});
