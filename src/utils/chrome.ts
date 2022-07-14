import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import puppeteer from "puppeteer-extra";
import { bytesToSize } from "./compress";

const chrome = {
  getChromePath(path?: string): string {
    if (fs.existsSync(".local-chromium")) {
      return this.getChromeInfos().path;
    }
    if (path) {
      if (fs.existsSync(path)) {
        return path;
      } else {
        console.log(
          `Le chemin ${path} donné dans le fichier config n'est pas un chemin valide`
        );
      }
    }
    let possiblePaths: string[] = [];
    // If program runs on windows
    if (process.platform === "win32") {
      possiblePaths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome SxS\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Google\\Chrome SxS\\Application\\chrome.exe",
        "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      ];
    } else if (process.platform === "linux") {
      const commandsToTry = [
        "which google-chrome-stable",
        "which chromium-browser",
        "which chromium",
        "which google-chrome",
      ];
      for (const command of commandsToTry) {
        try {
          possiblePaths.push(execSync(command).toString().trim());
        } catch (e) {
          // ignore
        }
      }
    }
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    throw new Error("Chrome n'a pas été trouvé sur l'ordinateur");
  },
  getChromeInfos(): {
    revision: string;
    path: string;
  } {
    const revision = "869685";

    let chromePath;
    if (process.platform === "win32") {
      chromePath = path.join(
        ".local-chromium",
        `win64-${revision}`,
        "chrome-win",
        "chrome.exe"
      );
    } else {
      chromePath = path.join(
        ".local-chromium",
        `linux-${revision}`,
        "chrome-linux",
        "chrome"
      );
    }
    return {
      revision: revision,
      path: path.resolve(chromePath),
    };
  },
  // return true if downloaded
  async downloadLocalChrome(progressCallback?: (downloadBytes: number, totalBytes: number) => void): Promise<boolean> {
    const chromeInfos = this.getChromeInfos();
    console.log("Chrome path", chromeInfos.path);

    const fetcher = puppeteer.createBrowserFetcher({
      path: path.resolve(".local-chromium"),
      platform: process.platform,
    });
    if (fs.existsSync(chromeInfos.path)) {
      console.log("Chrome déjà téléchargé");
      return false;
    }
    await fetcher.download(chromeInfos.revision, progressCallback);
    return true;
  },
};

export default chrome;
