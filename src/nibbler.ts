import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import { familySync, MUSL } from 'detect-libc';

export const getNibblerTool = async (): Promise<string> => {
    const version = core.getInput('nibbler-version');
    core.debug(`nibbler-version: ${version}`)

    let nibblerPath = tc.find('nibbler', version);

    if (!nibblerPath) {
        const arch = GetArch();
        const downloadUrl = `https://github.com/nordseth/Nibbler/releases/download/v${version}/Nibbler.${version}_${arch}.tar.gz`
        core.info(`downloading from ${downloadUrl}`)
        const nibblerTar = await tc.downloadTool(downloadUrl);
        const nibblerExtracted = await tc.extractTar(nibblerTar);
        nibblerPath = await tc.cacheFile(`${nibblerExtracted}/nibbler`, 'nibbler', 'nibbler', version);
    }

    core.debug(`nibbler-path: ${nibblerPath}`)
    return `${nibblerPath}/nibbler`;
}

function GetArch() {
    if (process.platform != 'linux') {
        return "win-x64";
    } else {
        const musl = familySync() == MUSL ? "musl-" : "";
        const arch = process.arch == 'arm64' ? "arm64" : "x64";
        return `linux-${musl}${arch}`;
    }
}
