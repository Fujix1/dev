const { parentPort } = require("worker_threads");
const path = require("node:path");
const fs = require("node:fs");

console.log("Hello from worker");

for (let i = 0; i < 2_000_000_000; i++) {}

parentPort.postMessage("message from worker");
for (let i = 0; i < 2_000_000_000; i++) {}

parentPort.postMessage("message from worker");
for (let i = 0; i < 2_000_000_000; i++) {}

parentPort.postMessage("message from worker");
for (let i = 0; i < 2_000_000_000; i++) {}

parentPort.postMessage("message from worker");
for (let i = 0; i < 2_000_000_000; i++) {}

parentPort.postMessage("message from worker");
