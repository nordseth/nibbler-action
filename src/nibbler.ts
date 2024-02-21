import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

export const getNibblerTool = async (): Promise<string> => {
    const version = core.getInput('nibbler-version');
    let nibblerPath = tc.find('nibbler', version);
    if (!nibblerPath) {
        const downloadUrl = `https://github.com/nordseth/Nibbler/releases/download/v${version}/Nibbler.${version}_linux-x64.tar.gz`
        core.info(`downloading from ${downloadUrl}`)
        const nibblerTar = await tc.downloadTool(downloadUrl);
        const nibblerTmp = await tc.extractTar(nibblerTar);
        nibblerPath = await tc.cacheFile(`${nibblerTmp}/nibbler`, 'nibbler', 'nibbler', version);
    }

    return `${nibblerPath}/nibbler`;
}