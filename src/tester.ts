import Downloader from "./components/Downloader";
import compress from "./utils/compress";
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
    downloader.destroy();
});