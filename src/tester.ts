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
    const download = downloader.downloadImageFromLink('https://www.japscan.ws/lecture-en-ligne/one-piece/1030/');
    download.on('start', (attributes) => console.log(attributes));
    download.on('loaded', () => console.log("finished loading"));
    await downloader.destroy();
});