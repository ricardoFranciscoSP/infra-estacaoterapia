import type { LaunchOptions } from "puppeteer";
import puppeteer from "puppeteer";
import fs from "fs";

const defaultArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu",
];

const getEnvExecutablePath = (): string | undefined => {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_BIN ||
    process.env.CHROMIUM_PATH
  );
};

const resolveExecutablePath = (): string | undefined => {
  const envPath = getEnvExecutablePath();
  const candidates = [
    envPath,
    puppeteer.executablePath(),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ].filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

export const getPuppeteerLaunchOptions = (
  options: LaunchOptions = {}
): LaunchOptions => {
  const mergedArgs = options.args
    ? Array.from(new Set([...defaultArgs, ...options.args]))
    : defaultArgs;
  const executablePath = options.executablePath || resolveExecutablePath();

  return {
    headless: true,
    ...options,
    args: mergedArgs,
    ...(executablePath ? { executablePath } : {}),
  };
};
