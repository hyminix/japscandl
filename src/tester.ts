import BasicTextHandler from "./components/BasicTextHandler";
import Downloader from "./components/Downloader";

let start: Date = new Date();

function startTimer() {
  start = new Date();
}

function endTimer() {
  const secondsElapsed = (new Date().getTime() - start.getTime()) / 1000;
  console.log("Took", secondsElapsed, "seconds");
}

(async () => {
  const downloader = await Downloader.launch({
    flags: {
      visible: true,
      fast: false,
    },
  });
  await downloader.downloadChapterFromLink(
    "https://www.japscan.me/lecture-en-ligne/one-piece/997/",
    { callback: BasicTextHandler.chapterDownloadCallback, forceDownload: true }
  );

  //await downloader.destroy();
  process.on("SIGINT", () => {
    downloader.destroy().then(() => {
      process.exit(1);
    });
  });
})();
