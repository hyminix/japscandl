import fetch from "node-fetch";

export async function getJapscanFromGithub(): Promise<string> {
  return (
    await (
      await fetch(
        "https://raw.githubusercontent.com/japdl/japscandl/main/data/address.txt"
      )
    ).text()
  ).trim();
}
