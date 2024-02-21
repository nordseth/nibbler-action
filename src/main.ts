import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { getNibblerTool } from './nibbler';
import { promises as fs } from "fs";

function CreateNibblerArgs() {
  const args = [
    '--from-image', core.getInput('from-image'),
    '--to-images', core.getInput('to-images'),
    '--digest-file=image-digest',
    '-v'
  ];

  const artifacts = core.getInput('artifacts');
  const appPath = core.getInput('app-path');
  if (artifacts) {
    if (!appPath) {
      throw new Error('app-path is required when artifacts is set');
    }
    args.push('--add', `${artifacts}:${appPath}`);
  }

  if (appPath) {
    args.push('--workdir', appPath);
  }

  const labels = core.getInput('labels');
  if (labels) {
    args.push('--labels', labels);
  }

  const entrypoint = core.getInput('entrypoint');
  if (entrypoint) {
    args.push('--entrypoint', entrypoint);
  }

  const cmd = core.getInput('cmd');
  if (cmd) {
    args.push('--cmd', cmd);
  }

  const user = core.getInput('user');
  if (user) {
    args.push('--user', user);
  }

  return args;
}

(async () => {
  try {
    const nibbler = await getNibblerTool();
    const args = CreateNibblerArgs();

    await exec.exec(nibbler, args);

    const digest = await fs.readFile('image-digest', 'utf-8');
    core.setOutput('image-digest', digest)
  } catch (error) {
    core.setFailed((error as Error).message);
  }
})();

