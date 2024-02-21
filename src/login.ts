import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { getNibblerTool } from './nibbler';

(async () => {
  try {
    const nibbler = await getNibblerTool();

    await exec.exec(nibbler, [
      'login',
      core.getInput('registry'),
      '--username', core.getInput('username'),
      '--password', core.getInput('password')]);

  } catch (error) {
    core.setFailed((error as Error).message);
  }
})();
