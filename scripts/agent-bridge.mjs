#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
import {runBridgeCli} from '../.build/agent/bridge.js';
export {bridge} from '../.build/agent/bridge.js';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runBridgeCli();
