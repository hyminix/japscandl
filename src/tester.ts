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
      fast: true,
    },
  });
  await downloader.downloadVolume("one-piece", 1, {
    callback: BasicTextHandler.volumeDownloadCallback,
  });
  await downloader.destroy();
  process.on("SIGINT", () => {
    downloader.destroy().then(() => {
      process.exit(1);
    });
  });
})();
