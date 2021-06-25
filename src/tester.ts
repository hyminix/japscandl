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
            console.log("onPage:", attributes.page, total)
        },
        onChapter: (attributes, current, total) => {
            console.log("onChapter:", attributes, current, total);
        },
        onVolume: (manga, current, total) => {
            console.log("onVolume:", manga, current, total);
        }
    }
}).then(async (downloader) => {
    await downloader.downloadChapter("one-piece", 997, {onPage: (attributes, total) => console.log(attributes, "/", total)});
    await downloader.destroy();
});