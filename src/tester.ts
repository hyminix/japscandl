import BasicTextHandler from "./components/BasicTextHandler";
import Downloader from "./components/Downloader";

Downloader.launch({
  flags: {
    visible: false,
    timeout: 60,
    verbose: false,
    mock: false,
  },
}).then(async (downloader) => {
  await downloader.downloadVolume("one-piece", 1, {
    compression: true,
    callback: BasicTextHandler.volumeDownloadCallback,
  });

  downloader.destroy();
});
