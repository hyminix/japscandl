import Downloader from "./components/Downloader";

Downloader.launch({
    flags: {
        fast: false,
        visible: false,
        timeout: 60,
        verbose: false,
    },
    onEvent: {
        onPage: (attributes, total) => {
            console.log(attributes.page, total)
        }
    }
}).then(async (downloader) => {
    await downloader.downloadChapter("one-piece", 998, true);
    await downloader.destroy();
});