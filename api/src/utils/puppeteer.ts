import type { LaunchOptions } from "puppeteer";

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

export const getPuppeteerLaunchOptions = (
  options: LaunchOptions = {}
): LaunchOptions => {
  const mergedArgs = options.args
    ? Array.from(new Set([...defaultArgs, ...options.args]))
    : defaultArgs;
  const executablePath = options.executablePath || getEnvExecutablePath();

  return {
    headless: true,
    ...options,
    args: mergedArgs,
    ...(executablePath ? { executablePath } : {}),
  };
};
