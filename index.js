const core = require('@actions/core');
const tc = require('@actions/tool-cache');

try {
  const version = core.getInput('version');
  nibblerPath = tc.find('nibbler', version);
  if (!nibblerPath) {
    const nibblerTar = await tc.downloadTool(`https://github.com/nordseth/Nibbler/releases/download/v${version}/Nibbler.${version}_linux-x64.tar.gz`);
    const nibblerTmp = await tc.extractTar(nibblerTar);
    nibblerPath = await tc.cacheFile(`${nibblerTmp}/nibbler`, 'nibbler', 'nibbler', version);
  }

} catch (error) {
  core.setFailed(error.message);
}