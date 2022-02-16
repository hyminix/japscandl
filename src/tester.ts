import Downloader from "./components/Downloader";
import { ChapterDownloadEmit, ChaptersDownloadEmit, VolumeDownloadEmit } from "./utils/emitTypes";
import fs from "fs";
import BasicTextHandler from "./components/BasicTextHandler";
import compress from "./utils/compress";

Downloader.launch({
  flags: {
    visible: false,
    timeout: 60,
    verbose: false,
    mock: false,
  },
}).then(async (downloader) => {

  await downloader.downloadChapters("one-piece", 998, 999, {
    compression: true,
    callback: BasicTextHandler.chaptersDownloadCallback,
  });

  downloader.destroy();
});
