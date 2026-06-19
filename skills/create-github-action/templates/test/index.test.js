const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const { run } = require('../src/index.js');

function resetInputs() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('INPUT_')) {
      delete process.env[key];
    }
  }
  process.exitCode = 0;
}

function setRequiredInputs() {
  process.env.INPUT_EXAMPLE_INPUT = 'value';
}

beforeEach(() => {
  resetInputs();
});

// core.setFailed() sets process.exitCode = 1 globally; reset it so it does not
// leak into the test process exit code.
afterEach(() => {
  process.exitCode = 0;
});

test('completes without failing when all required inputs are set', async () => {
  setRequiredInputs();

  await run();

  assert.notStrictEqual(process.exitCode, 1, 'should not mark the run as failed');
});

test('accepts the optional input', async () => {
  setRequiredInputs();
  process.env.INPUT_OPTIONAL_INPUT = 'extra';

  await run();

  assert.notStrictEqual(process.exitCode, 1);
});

test('fails when a required input is missing', async () => {
  resetInputs();

  await run();

  assert.strictEqual(process.exitCode, 1, 'should mark the run as failed');
});
