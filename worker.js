const { parentPort } = require("worker_threads");
const path = require("node:path");
const fs = require("node:fs");
const Parser = require("node-xml-stream");

console.log("WORKER: start parsing list.xml.");

const GameStatus = { gsGood: 0, gsImperfect: 1, gsPreliminary: 2, gsUnknown: 3 };

const parser = new Parser();
let version = "";
