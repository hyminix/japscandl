import MangaAttributes from "../MangaAttributes";

export interface MangaInfos {
  volumes: number;
  chapters: number;
  name: string;
  display: string;
  synopsis: string;
}

export type DownloaderOnPage = (
  attributes: MangaAttributes,
  currentPage: number,
  totalPages: number
) => void;

export type DownloaderOnChapter = (
  attributes: MangaAttributes,
  currentChapter: number,
  totalChapters: number
) => void;

export type DownloaderOnVolume = (
  mangaName: string,
  current: number,
  total: number
) => void;

export type ComponentFlags = {
  verbose?: boolean;
  timeout?: number;
  visible?: boolean;
  mock?: boolean;
  fast?: boolean;
};

export type MangaContent = {
  display: string;
  manga: string;
  synopsis: string;
  volumes: Volume[];
};

export type Volume = {
  name: string;
  number: string;
  chapters: Chapter[];
};

export type Chapter = {
  name: string;
  link: string;
};

export type SearchInfos = {
  mangakas: string;
  original_name: null | string;
  name: string;
  url: string;
  japscan: string;
  alternate_names: string;
};
