import BasicTextHandler from "./components/BasicTextHandler";
import Downloader from "./components/Downloader";
import MangaAttributes from "./MangaAttributes";
Downloader.launch({
    flags: {
        visible: false,
        timeout: 60,
        verbose: false,
    },
}).then(async (downloader) => {
    console.log("Downloading chapter");
    /*
    await downloader.downloadChapter("one-piece", 1000, {
        compression: true,
        deleteAfterCompression: true,
        callback: (events) => {
            BasicTextHandler.chapterDownloadCallback(events);
            events.on("done", () => {
                downloader.destroy();
            });
        },
    });
    // */

    await downloader.downloadChaptersFromLinks("one-piece", [
        new MangaAttributes("one-piece", 998).getLectureLink(downloader.WEBSITE),
        new MangaAttributes("one-piece", 1000).getLectureLink(downloader.WEBSITE)
    ],
        {
            compression: true,
            compressAsOne: true,
            callback: (events) => {
                BasicTextHandler.chaptersDownloadCallback(events);
                events.on("done", () => {
                    downloader.destroy();
                });
            }
        });
});