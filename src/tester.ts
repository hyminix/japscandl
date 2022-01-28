import Downloader from "./components/Downloader";
import { ChapterDownloadEmit, ChaptersDownloadEmit, VolumeDownloadEmit } from "./utils/emitTypes";
import fs from "fs";
import BasicTextHandler from "./components/BasicTextHandler";
import compress from "./utils/compress";

/* Downloader.launch({
  flags: {
    visible: false,
    timeout: 60,
    verbose: false,
    mock: false,
  },
}).then(async (downloader) => {
  await downloader.downloadVolume("one-piece", 103, {compression: true, deleteAfterCompression: true, callback: (events: VolumeDownloadEmit) => {
    BasicTextHandler.volumeDownloadCallback(events);
  }});

  downloader.destroy();
});
 */

compress.readImagesFromZip("manga/one-piece/one-piece-chapitre-998.cbr");