import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStore } from '../../lib/api/in_memory.js';
import {
  ERROR_CODES,
  JOB_STATES,
  PRICING_PATHS,
  QUOTE_PURPOSES,
  calculateQuoteTotal,
  computeAllowedActions,
} from '../../lib/api/domain.js';
import { extractVoice } from '../../lib/api/voice.js';

test('1. Session & Auth: distinct sessions and profile flags', async () => {
  const store = new InMemoryStore();

  // Create customer session
  const custSession = store.ensureSession();
  assert.equal(custSession.error, null);
  assert.ok(custSession.data.userId);
  assert.equal(custSession.data.hasWorkerProfile, false);

  // Switch to Rashid's worker user
  store.setCurrentUser('00000000-0000-0000-0000-000000000001');
  const workerSession = store.getSession();
  assert.equal(workerSession.error, null);
  assert.equal(workerSession.data.hasWorkerProfile, true);
  assert.equal(workerSession.data.displayName, 'Mohammad Rashid');

  // Sign out
  const signoutRes = store.signOut();
  assert.equal(signoutRes.error, null);
  assert.equal(signoutRes.data.signedOut, true);
  assert.equal(store.getSession().data, null);
});

test('2. Worker Profile & Discovery: save profile and filter by trade/locality', async () => {
  const store = new InMemoryStore();
  const userId = crypto.randomUUID();
  store.ensureSession(userId);

  // Save new worker profile
  const saveRes = store.saveWorkerProfile({
    fields: {
      name: 'Ahmed Plumber',
      tradeIds: ['plumber'],
      localityId: 'g-10-islamabad',
      serviceAreaIds: ['g-10-islamabad', 'g-9-islamabad'],
      yearsExperience: 4,
      bio: 'Fast and reliable plumbing services in G-10.',
    },
    idempotencyKey: 'idemp-profile-1',
  });

  assert.equal(saveRes.error, null);
  assert.equal(saveRes.data.name, 'Ahmed Plumber');
  assert.deepEqual(saveRes.data.tradeIds, ['plumber']);
  assert.equal(saveRes.data.localityId, 'g-10-islamabad');

  // Check discovery filters
  const plumbers = store.listWorkers({ tradeId: 'plumber', localityId: 'g-10-islamabad' });
  assert.equal(plumbers.error, null);
  assert.ok(plumbers.data.items.length >= 1);
  assert.equal(plumbers.data.items.some((w) => w.name === 'Ahmed Plumber'),false,'New profiles stay hidden until explicitly available');

  // Filter electricians only: Ahmed should NOT appear
  const electricians = store.listWorkers({ tradeId: 'electrician', localityId: 'g-10-islamabad' });
  assert.ok(electricians.data.items.every((w) => w.name !== 'Ahmed Plumber'));

  // Toggle availability
  const availRes = store.setAvailability({ available: true, idempotencyKey: 'idemp-avail-1' });
  assert.equal(availRes.error, null);
  assert.equal(availRes.data.availabilityOptIn, true);
  assert.ok(availRes.data.availabilityExpiresAt);
  assert.equal(availRes.data.isAvailableNow, true);
  assert.ok(store.listWorkers({tradeId:'plumber',localityId:'g-10-islamabad'}).data.items.some(w=>w.name==='Ahmed Plumber'));
});

test('3. Cross-User Denial: unrelated users cannot view or send messages on a job', async () => {
  const store = new InMemoryStore();

  const customerId = '00000000-0000-0000-0000-000000000011';
  const rashidWorkerId = '11111111-1111-1111-1111-111111111111'; // Owner: 00000000-0000-0000-0000-000000000001
  const eavesdropperId = '00000000-0000-0000-0000-000000000099';

  // Customer creates job request
  store.setCurrentUser(customerId);
  const reqRes = store.createRequest({
    workerId: rashidWorkerId,
    tradeId: 'electrician',
    localityId: 'g-10-islamabad',
    task: 'Water heater short circuit tripping main breaker',
    pricingPath: 'fixed',
  });
  assert.equal(reqRes.error, null);
  const jobId = reqRes.data.id;

  // Third-party user attempts to read job details
  store.setCurrentUser(eavesdropperId);
  const readRes = store.getJob({ jobId });
  assert.notEqual(readRes.error, null);
  assert.equal(readRes.error.code, ERROR_CODES.FORBIDDEN);

  // Third-party user attempts to read messages
  const msgReadRes = store.listMessages({ jobId });
  assert.notEqual(msgReadRes.error, null);
  assert.equal(msgReadRes.error.code, ERROR_CODES.FORBIDDEN);

  // Third-party user attempts to send message
  const msgSendRes = store.sendMessage({ jobId, text: 'Hacking attempt' });
  assert.notEqual(msgSendRes.error, null);
  assert.equal(msgSendRes.error.code, ERROR_CODES.FORBIDDEN);
});

test('4. Quote Stale Rejection: superseded quote cannot be accepted', async () => {
  const store = new InMemoryStore();
  const customerId = '00000000-0000-0000-0000-000000000011';
  const workerUserId = '00000000-0000-0000-0000-000000000001';
  const rashidWorkerId = '11111111-1111-1111-1111-111111111111';

  store.setCurrentUser(customerId);
  const req = store.createRequest({
    workerId: rashidWorkerId,
    tradeId: 'electrician',
    localityId: 'g-10-islamabad',
    task: 'Ceiling fan wiring replacement',
    pricingPath: 'fixed',
  });
  const jobId = req.data.id;

  // Worker issues Quote v1 (Rs 1500 = 150000 paisa)
  store.setCurrentUser(workerUserId);
  const q1Res = store.issueQuote({
    jobId,
    expectedVersion: 1,
    quoteFields: {
      purpose: QUOTE_PURPOSES.FIXED_JOB,
      scope: 'Replace wiring for 1 fan',
      labourMinor: 150000,
    },
  });
  assert.equal(q1Res.error, null);
  const quote1Id = q1Res.data.latestQuote.id;
  assert.equal(q1Res.data.version, 2);

  // Worker decides to issue Quote v2 with updated scope (Rs 2000 = 200000 paisa)
  const q2Res = store.issueQuote({
    jobId,
    expectedVersion: 2,
    quoteFields: {
      purpose: QUOTE_PURPOSES.FIXED_JOB,
      scope: 'Replace wiring and regulator for 1 fan',
      labourMinor: 200000,
    },
  });
  assert.equal(q2Res.error, null);
  assert.equal(q2Res.data.version, 3);
  const quote2Id = q2Res.data.latestQuote.id;

  // Customer tries to accept stale Quote v1
  store.setCurrentUser(customerId);
  const staleAccept = store.acceptQuote({
    jobId,
    quoteId: quote1Id,
    expectedVersion: 3,
  });
  assert.notEqual(staleAccept.error, null);
  assert.equal(staleAccept.error.code, ERROR_CODES.QUOTE_STALE);

  // Customer accepts Quote v2 -> succeeds
  const validAccept = store.acceptQuote({
    jobId,
    quoteId: quote2Id,
    expectedVersion: 3,
  });
  assert.equal(validAccept.error, null);
  assert.equal(validAccept.data.state, JOB_STATES.CONFIRMED);
  assert.equal(validAccept.data.version, 4);
});

test('5. Booking Race: two customers race to book one worker concurrently', async () => {
  const store = new InMemoryStore();
  const workerUserId = '00000000-0000-0000-0000-000000000001';
  const rashidWorkerId = '11111111-1111-1111-1111-111111111111';

  const customerA = '00000000-0000-0000-0000-000000000011';
  const customerB = '00000000-0000-0000-0000-000000000012';

  // Customer A creates request
  store.setCurrentUser(customerA);
  const jobARes = store.createRequest({
    workerId: rashidWorkerId,
    tradeId: 'electrician',
    localityId: 'g-10-islamabad',
    task: 'Main DB trip repair',
    pricingPath: 'fixed',
  });
  const jobAId = jobARes.data.id;

  // Customer B creates request
  store.setCurrentUser(customerB);
  const jobBRes = store.createRequest({
    workerId: rashidWorkerId,
    tradeId: 'electrician',
    localityId: 'g-10-islamabad',
    task: 'UPS socket wiring',
    pricingPath: 'fixed',
  });
  const jobBId = jobBRes.data.id;

  // Worker quotes both jobs
  store.setCurrentUser(workerUserId);
  const quoteA = store.issueQuote({
    jobId: jobAId,
    expectedVersion: 1,
    quoteFields: { purpose: QUOTE_PURPOSES.FIXED_JOB, scope: 'Fix DB', labourMinor: 100000 },
  });
  const quoteB = store.issueQuote({
    jobId: jobBId,
    expectedVersion: 1,
    quoteFields: { purpose: QUOTE_PURPOSES.FIXED_JOB, scope: 'Fix UPS socket', labourMinor: 80000 },
  });

  // Customer A accepts quote first
  store.setCurrentUser(customerA);
  const acceptA = store.acceptQuote({
    jobId: jobAId,
    quoteId: quoteA.data.latestQuote.id,
    expectedVersion: 2,
  });
  assert.equal(acceptA.error, null);
  assert.equal(acceptA.data.state, JOB_STATES.CONFIRMED);

  // Customer B attempts to accept quote while worker is engaged on Job A
  store.setCurrentUser(customerB);
  const acceptB = store.acceptQuote({
    jobId: jobBId,
    quoteId: quoteB.data.latestQuote.id,
    expectedVersion: 2,
  });

  // Must reject Customer B with WORKER_UNAVAILABLE!
  assert.notEqual(acceptB.error, null);
  assert.equal(acceptB.error.code, ERROR_CODES.WORKER_UNAVAILABLE);
});

test('6. Inspection Journey: visit agreement -> repair quote -> decline vs approve', async () => {
  const store = new InMemoryStore();
  const customerId = '00000000-0000-0000-0000-000000000011';
  const workerUserId = '00000000-0000-0000-0000-000000000002'; // Tariq Mehmood
  const tariqWorkerId = '22222222-2222-2222-2222-222222222222';

  // Customer creates inspection request
  store.setCurrentUser(customerId);
  const req = store.createRequest({
    workerId: tariqWorkerId,
    tradeId: 'plumber',
    localityId: 'g-9-islamabad',
    task: 'Underfloor water leakage with damp walls',
    pricingPath: 'inspection',
  });
  const jobId = req.data.id;

  // Worker issues inspection visit quote (Visit fee: Rs 800 = 80000 paisa)
  store.setCurrentUser(workerUserId);
  const visitQuote = store.issueQuote({
    jobId,
    expectedVersion: 1,
    quoteFields: {
      purpose: QUOTE_PURPOSES.INSPECTION_VISIT,
      scope: 'Diagnostic visit and fault location',
      visitFeeMinor: 80000,
      visitFeeCredited: true, // Will credit towards repair
    },
  });
  assert.equal(visitQuote.error, null);

  // Customer accepts inspection visit fee
  store.setCurrentUser(customerId);
  const acceptVisit = store.acceptQuote({
    jobId,
    quoteId: visitQuote.data.latestQuote.id,
    expectedVersion: 2,
  });
  assert.equal(acceptVisit.error, null);
  assert.equal(acceptVisit.data.state, JOB_STATES.CONFIRMED);

  // Worker arrives and starts visit
  store.setCurrentUser(workerUserId);
  const startVisit = store.transitionJob({
    jobId,
    action: 'start_visit',
    expectedVersion: 3,
  });
  assert.equal(startVisit.error, null);
  assert.equal(startVisit.data.state, JOB_STATES.VISITING);

  // Worker inspects and issues repair quote: labour Rs 4000 (400000 paisa), crediting Rs 800 visit fee
  const repairQuote = store.issueQuote({
    jobId,
    expectedVersion: 4,
    quoteFields: {
      purpose: QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION,
      scope: 'Replace broken concealed PVC elbow and pressure test',
      labourMinor: 400000,
      visitFeeMinor: 80000,
      visitFeeCredited: true,
    },
  });
  assert.equal(repairQuote.error, null);
  assert.equal(repairQuote.data.state, JOB_STATES.AWAITING_REPAIR_APPROVAL);

  // Verify deterministic credit arithmetic: 400000 - 80000 = 320000 paisa (Rs 3200)
  const netPayable = calculateQuoteTotal({
    purpose: QUOTE_PURPOSES.REPAIR_AFTER_INSPECTION,
    labourMinor: 400000,
    visitFeeMinor: 80000,
    visitFeeCredited: true,
    previousVisitFeeMinor: 80000,
  });
  assert.equal(netPayable, 320000);

  // Customer accepts repair quote
  store.setCurrentUser(customerId);
  const acceptRepair = store.acceptQuote({
    jobId,
    quoteId: repairQuote.data.latestQuote.id,
    expectedVersion: 5,
  });
  assert.equal(acceptRepair.error, null);
  assert.equal(acceptRepair.data.state, JOB_STATES.IN_PROGRESS);

  // Worker marks work done -> awaiting completion; physical assignment released
  store.setCurrentUser(workerUserId);
  const workDone = store.transitionJob({
    jobId,
    action: 'mark_work_done',
    expectedVersion: 6,
  });
  assert.equal(workDone.error, null);
  assert.equal(workDone.data.state, JOB_STATES.AWAITING_COMPLETION);

  // Customer confirms completion -> completed
  store.setCurrentUser(customerId);
  const completed = store.transitionJob({
    jobId,
    action: 'confirm_completion',
    expectedVersion: 7,
  });
  assert.equal(completed.error, null);
  assert.equal(completed.data.state, JOB_STATES.COMPLETED);

  // Customer submits review
  const reviewRes = store.submitReview({
    jobId,
    rating: 5,
    punctuality: true,
    priceHonoured: true,
    text: 'Leakage solved cleanly. Highly recommended!',
  });
  assert.equal(reviewRes.error, null);
  assert.equal(reviewRes.data.review.rating, 5);
  assert.equal(reviewRes.data.review.priceHonoured, true);

  // Submitting duplicate review fails
  const dupReview = store.submitReview({
    jobId,
    rating: 4,
  });
  assert.notEqual(dupReview.error, null);
  assert.equal(dupReview.error.code, ERROR_CODES.FORBIDDEN);
});

test('7. Allowed Actions: strict role-based capability computation', () => {
  const customerId = 'cust-123';
  const workerOwnerId = 'work-456';

  const jobAwaitingComp = {
    id: 'job-1',
    customerId,
    state: JOB_STATES.AWAITING_COMPLETION,
    pricingPath: PRICING_PATHS.FIXED,
  };

  // Customer should see confirm_completion
  const custActions = computeAllowedActions(jobAwaitingComp, customerId, workerOwnerId);
  assert.deepEqual(custActions, ['confirm_completion']);

  // Worker has already released assignment on mark_work_done; no redundant release_assignment
  const workerActions = computeAllowedActions(jobAwaitingComp, workerOwnerId, workerOwnerId);
  assert.deepEqual(workerActions, []);

  // Worker in issue_open should see release_assignment
  const jobIssueOpen = { ...jobAwaitingComp, state: JOB_STATES.ISSUE_OPEN };
  assert.deepEqual(computeAllowedActions(jobIssueOpen, workerOwnerId, workerOwnerId), ['release_assignment']);

  // Worker in quoted state should not see decline (matches SQL transitionJob)
  const jobQuoted = { ...jobAwaitingComp, state: JOB_STATES.QUOTED };
  assert.deepEqual(computeAllowedActions(jobQuoted, workerOwnerId, workerOwnerId), []);

  // Unrelated user should see empty array
  const strangerActions = computeAllowedActions(jobAwaitingComp, 'stranger-789', workerOwnerId);
  assert.deepEqual(strangerActions, []);
});

test('8. AI Extraction Contract: safe fallback and validation without mutation', async () => {
  // Voice extraction when GEMINI_API_KEY is not set
  const res = await extractVoice({
    audioRef: 'audio/sample-urdu-onboarding.webm',
    purpose: 'worker_profile',
    locale: 'ur',
  });

  // Explicit failure required instead of fake success
  assert.equal(res.data, null);
  assert.equal(res.error.code, ERROR_CODES.AI_UNAVAILABLE);
  assert.equal(res.error.retryable, false);
});
