import Downloader from "./components/Downloader";

Downloader.launch({
    flags: {
        fast: false,
        headless: false,
        timeout: 60,
        verbose: false,
    }
}).then((downloader) => {
    downloader
        .fetchStats("one-piece").then((stats) => console.log(stats));
});