import BasicTextHandler from "./components/BasicTextHandler";
import Downloader from "./components/Downloader";
Downloader.launch({
    flags: {
        fast: false,
        visible: false,
        timeout: 60,
        verbose: false,
    },
}).then(async (downloader) => {
    await downloader.downloadChapter("one-piece", 1000, {
        compression: "cbr",
        callback: (events) => {
            BasicTextHandler.chapterDownloadCallback(events);
            events.on("done", () => {
                downloader.destroy();
            });
        },
    });
});