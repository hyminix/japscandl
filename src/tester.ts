import BasicTextHandler from "./components/BasicTextHandler";
import Downloader from "./components/Downloader";
import MangaAttributes from "./MangaAttributes";

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
  const downloader = await Downloader.launch({
    flags: {
      visible: true,
      fast: true,
    },
  });


  endTimer("Init");

  startTimer();

  const manga =  new MangaAttributes("kaguya-sama-wa-kokurasetai-tensai-tachi-no-renai-zunousen", 89);

  await downloader.downloadChapterFromLink(manga.getLectureLink(), {callback: BasicTextHandler.chapterDownloadCallback, compression: true, deleteAfterCompression: true});

  endTimer("Task");

  await downloader.destroy();
})();
