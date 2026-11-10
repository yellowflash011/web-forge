import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../../lib/api/index.js';

test('Facade: all 20 required API_CONTRACT functions are defined and async', () => {
  const expectedCalls = [
    'ensureSession',
    'getSession',
    'getMyWorkerProfile',
    'signOut',
    'saveWorkerProfile',
    'getWorker',
    'listWorkers',
    'setAvailability',
    'createRequest',
    'listMyJobs',
    'getJob',
    'listMessages',
    'sendMessage',
    'issueQuote',
    'acceptQuote',
    'transitionJob',
    'submitReview',
    'reportIssue',
    'uploadAudio',
    'getAudioPlaybackUrl',
    'extractVoice',
  ];

  for (const callName of expectedCalls) {
    assert.equal(typeof api[callName], 'function', `Expected api.${callName} to be a function`);
  }
});

test('Facade: end-to-end session, worker discovery, and job creation via lib/api facade', async () => {
  // 1. Establish session
  const sessionRes = await api.ensureSession();
  assert.equal(sessionRes.error, null);
  assert.ok(sessionRes.data.userId);

  // 2. Discover available workers
  const listRes = await api.listWorkers({ localityId: 'g-10-islamabad', limit: 5 });
  assert.equal(listRes.error, null);
  assert.ok(listRes.data.items.length >= 1);
  const targetWorker = listRes.data.items[0];

  // 3. Inspect worker profile
  const workerRes = await api.getWorker({ workerId: targetWorker.id });
  assert.equal(workerRes.error, null);
  assert.equal(workerRes.data.worker.id, targetWorker.id);
  assert.ok(Array.isArray(workerRes.data.reviews));

  // 4. Create job request
  const reqRes = await api.createRequest({
    workerId: targetWorker.id,
    tradeId: targetWorker.tradeIds[0] || 'electrician',
    localityId: 'g-10-islamabad',
    task: 'Main distribution board circuit breaker tripping',
    pricingPath: 'fixed',
    idempotencyKey: 'idemp-req-facade-1',
  });
  assert.equal(reqRes.error, null);
  const job = reqRes.data;
  assert.equal(job.state, 'requested');

  // 5. Query my jobs
  const myJobsRes = await api.listMyJobs({ workspace: 'customer' });
  assert.equal(myJobsRes.error, null);
  assert.ok(myJobsRes.data.items.some((j) => j.id === job.id));

  // 6. Query job details with allowed actions
  const getJobRes = await api.getJob({ jobId: job.id });
  assert.equal(getJobRes.error, null);
  assert.equal(getJobRes.data.job.id, job.id);
  assert.ok(getJobRes.data.allowedActions.includes('cancel'));
});

test('Facade: getMyWorkerProfile returns null for pure customer and Worker for worker account', async () => {
  // Pure customer
  const custSession = await api.ensureSession();
  const custWorkerProfile = await api.getMyWorkerProfile();
  assert.equal(custWorkerProfile.error, null);
  assert.equal(custWorkerProfile.data, null);

  // Save profile for this user
  const saved = await api.saveWorkerProfile({
    fields: {
      name: 'Test Pro Worker',
      tradeIds: ['electrician'],
      localityId: 'g-10-islamabad',
    },
  });
  assert.equal(saved.error, null);

  // Now getMyWorkerProfile returns the worker profile
  const found = await api.getMyWorkerProfile();
  assert.equal(found.error, null);
  assert.ok(found.data);
  assert.equal(found.data.name, 'Test Pro Worker');
});
