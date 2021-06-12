import Downloader from "./components/Downloader";

Downloader.launch({
    flags: {
        fast: false,
        visible: true,
        timeout: 60,
        verbose: false,
    }
}).then(async (downloader) => {
    const page = await downloader.browser.newPage();
    page.goto("https://www.japscan.ws/lecture-en-ligne/one-piece/998/");
});