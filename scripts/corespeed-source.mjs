#!/usr/bin/env node
// Optional explicitly selected source adapter; never imported by the default memory CLI.
import {runCoreSpeedSource} from '../.build/adapters/corespeed-source.js';
await runCoreSpeedSource();
