# <img src="src/images/icon48.png" width="45" align="left"> GIFs for GitHub

A Browser extension that makes it easy to search GIPHY and add a GIF into any GitHub comment box.

<img src="demo.jpg" alt="Example image">

---

## Install

[link-chrome]: https://chrome.google.com/webstore/detail/gifs-for-github/dkgjnpbipbdaoaadbdhpiokaemhlphep "Version published on Chrome Web Store"
[link-firefox]: https://addons.mozilla.org/en-US/firefox/addon/gifs-for-github/ "Version published on Mozilla Add-ons"

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/dkgjnpbipbdaoaadbdhpiokaemhlphep.svg?label=%20">][link-chrome]

[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/firefox/firefox.svg" width="48" alt="Firefox" valign="middle">][link-firefox] [<img valign="middle" src="https://img.shields.io/amo/v/gifs-for-github.svg?label=%20">][link-firefox]

---

## Contributing

```sh
git clone https://github.com/N1ck/gifs-for-github
cd gifs-for-github
yarn install
```

```sh
npm run watch # Listen to file changes and automatically rebuild
```

Once built, load it in the browser of your choice with [web-ext](https://github.com/mozilla/web-ext):

```sh
npx web-ext run --target=chromium # Open extension in Chrome
```

```sh
npx web-ext run # Open extension in Firefox
```

Or you can [load it manually in Chrome](https://www.smashingmagazine.com/2017/04/browser-extension-edge-chrome-firefox-opera-brave-vivaldi/#google-chrome-opera-vivaldi) or [Firefox](https://www.smashingmagazine.com/2017/04/browser-extension-edge-chrome-firefox-opera-brave-vivaldi/#mozilla-firefox).

---

If you want to read about why I built this extension, and some of the challenges I faced, check out my [blog post][link-blogpost].

[link-cws]: https://chrome.google.com/webstore/detail/gifs-for-github/dkgjnpbipbdaoaadbdhpiokaemhlphep?hl=en "Version published on Chrome Web Store"
[link-amo]: https://addons.mozilla.org/en-US/firefox/addon/gifs-for-github/ "Version published on Mozilla Add-ons"
[link-blogpost]: https://medium.com/we-build-vend/helping-engineers-gif-their-best-life-challenges-faced-when-building-the-gifs-for-github-f0cac9dd8fa5 "Helping Engineers GIF Their Best Life: Challenges Faced When Building the ‘GIFs for GitHub’ Extension"
