import axios from "axios";
import puppeteer from "puppeteer-core";
import Downloader from "./components/Downloader";
import BasicTextHandler from "./components/BasicTextHandler";
import {getJapscanFromGithub} from "./utils/website";

let start: Date = new Date();

function startTimer() {
  start = new Date();
}

function endTimer(what?: string) {
  const secondsElapsed = (new Date().getTime() - start.getTime()) / 1000;
  if(what){
    console.log(what, "took", secondsElapsed, "seconds");
    return;
  }
  console.log("Took", secondsElapsed, "seconds");
}

(async () => {
  startTimer();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const downloader = await Downloader.getInstance();

  endTimer("init");

  startTimer();
  await downloader.downloadChapter("one-piece", 1000, {forceDownload: true, callback: BasicTextHandler.chapterDownloadCallback});
  endTimer("download");
})();

