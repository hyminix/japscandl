import Downloader from "./components/Downloader";

Downloader.launch().then((downloader) => {
    downloader
        .isAWebtoon("solo-leveling")
        .then(res => console.log(res))
        .then(() => downloader.destroy());
});