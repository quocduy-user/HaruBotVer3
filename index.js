require('dotenv').config();
const { spawn } = require("child_process");
const logger = require("./utils/log");

function startBot(message) {
  // Simple ASCII art header
  const customAsciiArt = `
 █ █ ▄▀█ █▀█ █ █
 █▀█ █▀█ █▀▄ █▄█\n`;
  if (message) logger(`${customAsciiArt}\n${message}`, "[ Bắt Đầu ]");

  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "main.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
    env: { ...process.env }
  });

  const forwardAndLog = (signal) => {
    logger(`Forwarding signal ${signal} to child...`, "[ Manager ]");
    try { child.kill(signal); } catch {}
  };

  process.once('SIGINT', () => forwardAndLog('SIGINT'));
  process.once('SIGTERM', () => forwardAndLog('SIGTERM'));

  child.on("close", async (codeExit, signal) => {
    if (signal) {
      logger(`Child exited due to signal ${signal}`, "[ Manager ]");
      return; // do not auto-restart on signal-based exits
    }

    const code = typeof codeExit === 'number' ? codeExit : 0;
    logger(`Child exited with code ${code}`, "[ Manager ]");

    // Restart rules:
    // - code === 1: immediate restart
    // - code in [20..60]: restart after (code-20) seconds (e.g., 25 -> 5s)
    // - otherwise: no restart
    let delayMs = null;
    if (code === 1) {
      delayMs = 0;
    } else if (code >= 20 && code <= 60) {
      delayMs = (code - 20) * 1000;
    }

    if (delayMs === null) {
      logger(`No restart scheduled for code ${code}.`, "[ Manager ]");
      return;
    }

    if (delayMs > 0) {
      logger(`Restarting in ${delayMs / 1000}s...`, "[ Manager ]");
      await new Promise(r => setTimeout(r, delayMs));
    } else {
      logger(`Restarting immediately...`, "[ Manager ]");
    }
    startBot("Restarting...");
  });

  child.on("error", function (error) {
    logger("An error occurred: " + JSON.stringify(error), "[ Starting ]");
  });
}

startBot();
