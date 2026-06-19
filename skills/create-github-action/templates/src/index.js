const core = require('@actions/core');

async function run() {
  try {
    const exampleInput = core.getInput('example_input', { required: true });
    const optionalInput = core.getInput('optional_input');

    // If the action receives a secret, mask it:
    // const token = core.getInput('token', { required: true });
    // core.setSecret(token);

    core.info('hello from your action');
    core.info(`example_input=${exampleInput}`);
    core.info(`optional_input=${optionalInput || '(none)'}`);

    // TODO: implement the action logic and set outputs with core.setOutput(...).
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

module.exports = { run };

// Only auto-run when executed as the entrypoint (not when imported in tests).
if (require.main === module) {
  run();
}
