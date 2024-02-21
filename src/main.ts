import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { getNibblerTool } from './nibbler';

(async () => {
  try {
    const nibbler = await getNibblerTool();
    await exec.exec(nibbler, ['--version']);
    core.setOutput('image-digest', 'sha256:123456789abcdef')
  } catch (error) {
    core.setFailed((error as Error).message);
  }
})();
