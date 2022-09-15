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
  let downloader = await Downloader.launch({
    flags: {
      fast: true,
    },
  });
  console.log("----- FAST -----");
  startTimer();
  await downloader.downloadChapters("one-piece", 998, 999, {
    forceDownload: true,
  });
  endTimer();
  await downloader.destroy();

  downloader = await Downloader.launch();
  console.log("----- SLOW -----");
  startTimer();
  await downloader.downloadChapters("one-piece", 998, 999, {
    forceDownload: true,
  });
  endTimer();

  await downloader.destroy();
})();
