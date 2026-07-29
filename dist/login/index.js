/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 772:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0



const childProcess = __nccwpck_require__(317);
const { isLinux, getReport } = __nccwpck_require__(235);
const { LDD_PATH, SELF_PATH, readFile, readFileSync } = __nccwpck_require__(991);
const { interpreterPath } = __nccwpck_require__(167);

let cachedFamilyInterpreter;
let cachedFamilyFilesystem;
let cachedVersionFilesystem;

const command = 'getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true';
let commandOut = '';

const safeCommand = () => {
  if (!commandOut) {
    return new Promise((resolve) => {
      childProcess.exec(command, (err, out) => {
        commandOut = err ? ' ' : out;
        resolve(commandOut);
      });
    });
  }
  return commandOut;
};

const safeCommandSync = () => {
  if (!commandOut) {
    try {
      commandOut = childProcess.execSync(command, { encoding: 'utf8' });
    } catch (_err) {
      commandOut = ' ';
    }
  }
  return commandOut;
};

/**
 * A String constant containing the value `glibc`.
 * @type {string}
 * @public
 */
const GLIBC = 'glibc';

/**
 * A Regexp constant to get the GLIBC Version.
 * @type {string}
 */
const RE_GLIBC_VERSION = /LIBC[a-z0-9 \-).]*?(\d+\.\d+)/i;

/**
 * A String constant containing the value `musl`.
 * @type {string}
 * @public
 */
const MUSL = 'musl';

const isFileMusl = (f) => f.includes('libc.musl-') || f.includes('ld-musl-');

const familyFromReport = () => {
  const report = getReport();
  if (report.header && report.header.glibcVersionRuntime) {
    return GLIBC;
  }
  if (Array.isArray(report.sharedObjects)) {
    if (report.sharedObjects.some(isFileMusl)) {
      return MUSL;
    }
  }
  return null;
};

const familyFromCommand = (out) => {
  const [getconf, ldd1] = out.split(/[\r\n]+/);
  if (getconf && getconf.includes(GLIBC)) {
    return GLIBC;
  }
  if (ldd1 && ldd1.includes(MUSL)) {
    return MUSL;
  }
  return null;
};

const familyFromInterpreterPath = (path) => {
  if (path) {
    if (path.includes('/ld-musl-')) {
      return MUSL;
    } else if (path.includes('/ld-linux-')) {
      return GLIBC;
    }
  }
  return null;
};

const getFamilyFromLddContent = (content) => {
  content = content.toString();
  if (content.includes('musl')) {
    return MUSL;
  }
  if (content.includes('GNU C Library')) {
    return GLIBC;
  }
  return null;
};

const familyFromFilesystem = async () => {
  if (cachedFamilyFilesystem !== undefined) {
    return cachedFamilyFilesystem;
  }
  cachedFamilyFilesystem = null;
  try {
    const lddContent = await readFile(LDD_PATH);
    cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
  } catch (e) {}
  return cachedFamilyFilesystem;
};

const familyFromFilesystemSync = () => {
  if (cachedFamilyFilesystem !== undefined) {
    return cachedFamilyFilesystem;
  }
  cachedFamilyFilesystem = null;
  try {
    const lddContent = readFileSync(LDD_PATH);
    cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
  } catch (e) {}
  return cachedFamilyFilesystem;
};

const familyFromInterpreter = async () => {
  if (cachedFamilyInterpreter !== undefined) {
    return cachedFamilyInterpreter;
  }
  cachedFamilyInterpreter = null;
  try {
    const selfContent = await readFile(SELF_PATH);
    const path = interpreterPath(selfContent);
    cachedFamilyInterpreter = familyFromInterpreterPath(path);
  } catch (e) {}
  return cachedFamilyInterpreter;
};

const familyFromInterpreterSync = () => {
  if (cachedFamilyInterpreter !== undefined) {
    return cachedFamilyInterpreter;
  }
  cachedFamilyInterpreter = null;
  try {
    const selfContent = readFileSync(SELF_PATH);
    const path = interpreterPath(selfContent);
    cachedFamilyInterpreter = familyFromInterpreterPath(path);
  } catch (e) {}
  return cachedFamilyInterpreter;
};

/**
 * Resolves with the libc family when it can be determined, `null` otherwise.
 * @returns {Promise<?string>}
 */
const family = async () => {
  let family = null;
  if (isLinux()) {
    family = await familyFromInterpreter();
    if (!family) {
      family = await familyFromFilesystem();
      if (!family) {
        family = familyFromReport();
      }
      if (!family) {
        const out = await safeCommand();
        family = familyFromCommand(out);
      }
    }
  }
  return family;
};

/**
 * Returns the libc family when it can be determined, `null` otherwise.
 * @returns {?string}
 */
const familySync = () => {
  let family = null;
  if (isLinux()) {
    family = familyFromInterpreterSync();
    if (!family) {
      family = familyFromFilesystemSync();
      if (!family) {
        family = familyFromReport();
      }
      if (!family) {
        const out = safeCommandSync();
        family = familyFromCommand(out);
      }
    }
  }
  return family;
};

/**
 * Resolves `true` only when the platform is Linux and the libc family is not `glibc`.
 * @returns {Promise<boolean>}
 */
const isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;

/**
 * Returns `true` only when the platform is Linux and the libc family is not `glibc`.
 * @returns {boolean}
 */
const isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;

const versionFromFilesystem = async () => {
  if (cachedVersionFilesystem !== undefined) {
    return cachedVersionFilesystem;
  }
  cachedVersionFilesystem = null;
  try {
    const lddContent = await readFile(LDD_PATH);
    const versionMatch = lddContent.match(RE_GLIBC_VERSION);
    if (versionMatch) {
      cachedVersionFilesystem = versionMatch[1];
    }
  } catch (e) {}
  return cachedVersionFilesystem;
};

const versionFromFilesystemSync = () => {
  if (cachedVersionFilesystem !== undefined) {
    return cachedVersionFilesystem;
  }
  cachedVersionFilesystem = null;
  try {
    const lddContent = readFileSync(LDD_PATH);
    const versionMatch = lddContent.match(RE_GLIBC_VERSION);
    if (versionMatch) {
      cachedVersionFilesystem = versionMatch[1];
    }
  } catch (e) {}
  return cachedVersionFilesystem;
};

const versionFromReport = () => {
  const report = getReport();
  if (report.header && report.header.glibcVersionRuntime) {
    return report.header.glibcVersionRuntime;
  }
  return null;
};

const versionSuffix = (s) => s.trim().split(/\s+/)[1];

const versionFromCommand = (out) => {
  const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
  if (getconf && getconf.includes(GLIBC)) {
    return versionSuffix(getconf);
  }
  if (ldd1 && ldd2 && ldd1.includes(MUSL)) {
    return versionSuffix(ldd2);
  }
  return null;
};

/**
 * Resolves with the libc version when it can be determined, `null` otherwise.
 * @returns {Promise<?string>}
 */
const version = async () => {
  let version = null;
  if (isLinux()) {
    version = await versionFromFilesystem();
    if (!version) {
      version = versionFromReport();
    }
    if (!version) {
      const out = await safeCommand();
      version = versionFromCommand(out);
    }
  }
  return version;
};

/**
 * Returns the libc version when it can be determined, `null` otherwise.
 * @returns {?string}
 */
const versionSync = () => {
  let version = null;
  if (isLinux()) {
    version = versionFromFilesystemSync();
    if (!version) {
      version = versionFromReport();
    }
    if (!version) {
      const out = safeCommandSync();
      version = versionFromCommand(out);
    }
  }
  return version;
};

module.exports = {
  GLIBC,
  MUSL,
  family,
  familySync,
  isNonGlibcLinux,
  isNonGlibcLinuxSync,
  version,
  versionSync
};


/***/ }),

/***/ 167:
/***/ ((module) => {

// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0



const interpreterPath = (elf) => {
  if (elf.length < 64) {
    return null;
  }
  if (elf.readUInt32BE(0) !== 0x7F454C46) {
    // Unexpected magic bytes
    return null;
  }
  if (elf.readUInt8(4) !== 2) {
    // Not a 64-bit ELF
    return null;
  }
  if (elf.readUInt8(5) !== 1) {
    // Not little-endian
    return null;
  }
  const offset = elf.readUInt32LE(32);
  const size = elf.readUInt16LE(54);
  const count = elf.readUInt16LE(56);
  for (let i = 0; i < count; i++) {
    const headerOffset = offset + (i * size);
    const type = elf.readUInt32LE(headerOffset);
    if (type === 3) {
      const fileOffset = elf.readUInt32LE(headerOffset + 8);
      const fileSize = elf.readUInt32LE(headerOffset + 32);
      return elf.subarray(fileOffset, fileOffset + fileSize).toString().replace(/\0.*$/g, '');
    }
  }
  return null;
};

module.exports = {
  interpreterPath
};


/***/ }),

/***/ 991:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0



const fs = __nccwpck_require__(896);

const LDD_PATH = '/usr/bin/ldd';
const SELF_PATH = '/proc/self/exe';
const MAX_LENGTH = 2048;

/**
 * Read the content of a file synchronous
 *
 * @param {string} path
 * @returns {Buffer}
 */
const readFileSync = (path) => {
  const fd = fs.openSync(path, 'r');
  const buffer = Buffer.alloc(MAX_LENGTH);
  const bytesRead = fs.readSync(fd, buffer, 0, MAX_LENGTH, 0);
  fs.close(fd, () => {});
  return buffer.subarray(0, bytesRead);
};

/**
 * Read the content of a file
 *
 * @param {string} path
 * @returns {Promise<Buffer>}
 */
const readFile = (path) => new Promise((resolve, reject) => {
  fs.open(path, 'r', (err, fd) => {
    if (err) {
      reject(err);
    } else {
      const buffer = Buffer.alloc(MAX_LENGTH);
      fs.read(fd, buffer, 0, MAX_LENGTH, 0, (_, bytesRead) => {
        resolve(buffer.subarray(0, bytesRead));
        fs.close(fd, () => {});
      });
    }
  });
});

module.exports = {
  LDD_PATH,
  SELF_PATH,
  readFileSync,
  readFile
};


/***/ }),

/***/ 235:
/***/ ((module) => {

// Copyright 2017 Lovell Fuller and others.
// SPDX-License-Identifier: Apache-2.0



const isLinux = () => process.platform === 'linux';

let report = null;
const getReport = () => {
  if (!report) {
    /* istanbul ignore next */
    if (isLinux() && process.report) {
      const orig = process.report.excludeNetwork;
      process.report.excludeNetwork = true;
      report = process.report.getReport();
      process.report.excludeNetwork = orig;
    } else {
      report = {};
    }
  }
  return report;
};

module.exports = { isLinux, getReport };


/***/ }),

/***/ 430:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
const core = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/core'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const exec = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/exec'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const nibbler_1 = __nccwpck_require__(211);
(async () => {
    try {
        const nibbler = await (0, nibbler_1.getNibblerTool)();
        await exec.exec(nibbler, [
            'login',
            core.getInput('registry'),
            '--username', core.getInput('username'),
            '--password', core.getInput('password')
        ]);
    }
    catch (error) {
        core.setFailed(error.message);
    }
})();


/***/ }),

/***/ 211:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getNibblerTool = void 0;
const core = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/core'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const tc = __importStar(__nccwpck_require__(Object(function webpackMissingModule() { var e = new Error("Cannot find module '@actions/tool-cache'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())));
const detect_libc_1 = __nccwpck_require__(772);
const getNibblerTool = async () => {
    const version = core.getInput('nibbler-version');
    core.debug(`nibbler-version: ${version}`);
    let nibblerPath = tc.find('nibbler', version);
    if (!nibblerPath) {
        const arch = GetArch();
        const downloadUrl = `https://github.com/nordseth/Nibbler/releases/download/v${version}/Nibbler.${version}_${arch}.tar.gz`;
        core.info(`downloading from ${downloadUrl}`);
        const nibblerTar = await tc.downloadTool(downloadUrl);
        const nibblerExtracted = await tc.extractTar(nibblerTar);
        nibblerPath = await tc.cacheFile(`${nibblerExtracted}/nibbler`, 'nibbler', 'nibbler', version);
    }
    core.debug(`nibbler-path: ${nibblerPath}`);
    return `${nibblerPath}/nibbler`;
};
exports.getNibblerTool = getNibblerTool;
function GetArch() {
    if (process.platform != 'linux') {
        return "win-x64";
    }
    else {
        const musl = (0, detect_libc_1.familySync)() == detect_libc_1.MUSL ? "musl-" : "";
        const arch = process.arch == 'arm64' ? "arm64" : "x64";
        return `linux-${musl}${arch}`;
    }
}


/***/ }),

/***/ 317:
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ 896:
/***/ ((module) => {

module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(430);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;