# UI review

**What it's for:** reviewing ukemusic's user interface. It takes a picture of every screen of the desktop app, and of the web player on an iPad and on an iPhone, and puts them in one page where you can go through them app by app or compare the three side by side. Use it to spot what's unclear, inconsistent or missing, to check a change hasn't spoilt something, and to talk about a screen by its id ("R3 on the iPhone").

It doesn't test that things work (`npm test` does that); it shows what they look like.

## Making it

The first time, in the project folder:

```
npm install
npm install --no-save playwright
npx playwright install chromium
```

Then, each time:

```
npm run ui-review
```

It takes about 20–30 minutes. Windows open and close by themselves while it works: leave the computer alone until it says it's done. It makes the **`UI review`** folder in the project folder. Open `UI review/index.html` in a browser.

It doesn't touch your own songs or settings: the app runs with a settings folder of its own and a copy of the public-domain songs, in your computer's temporary folder (`ukemusic-ui-review`).

### Only part of it

```
npm run ui-review -- desktop          only the desktop app (or ipad, or iphone, or two of them)
npm run ui-review -- desktop R A      only the Learn and Accompaniment screens of the desktop app
npm run ui-review -- --page           only remake the page, from the pictures already taken
npm run ui-review -- --out "D:\UI review 4.52"     somewhere else (to keep an earlier review)
```

Section letters are in `catalog.json`: L Library, S Song sheet, P Playing, R Learn, A Accompaniment, E Writing and editing, X Export and download, G Settings, F Free Practice, D Devices and sync. The other pictures from the last run are kept, so a part can be redone on its own.

## The review page

- **By app**: Desktop, iPad or iPhone, every screen section by section. Click a picture to see it large; ← and → go through all of that app's screens; Z (or the picture) switches between fit and actual size; Esc closes.
- **Compare apps**: each screen with the three apps side by side; "Not in the …" where an app doesn't have it. The dots in the list on the left show which apps have each screen. **Look closer** shows one screen larger, with a box for review notes; ← and → go to the next screen.
- **Review notes**: every note in one place, with Copy. Notes are kept in the browser they're typed in, nowhere else.

Each screen has an **id** (a section letter and a number, like S4 or R3) and a **name**, the same in every app, from `catalog.json`. The caption under each picture says what it shows in that app.

The iPad and iPhone pictures are taken in a browser set to the device's screen size, touch and user agent (an iPad in portrait, an iPhone 15), not in Safari on a real device: small differences are possible, and things only a real device does (the share sheet, the keyboard) aren't shown.

## How it works

| File | What it does |
|---|---|
| `run.js` | `npm run ui-review`: runs the rest in order. Builds the web player (`node web/make.js`) and serves it on this computer while the iPad and iPhone pictures are taken. |
| `desktop.js` | Opens the desktop app (with Playwright's Electron support), goes to each screen and takes its picture. |
| `web.js` | The same for the web player, as an iPad or an iPhone. |
| `practice.js` | The Free Practice screens: the same for both apps, so one set of steps. |
| `catalog.json` | The sections, and each screen's id and name. |
| `build.js` | Puts the pictures and the page together in the `UI review` folder. |
| `page.html` | The review page (the list of screens is put into it by `build.js`). |

Each picture is saved as `<id>.jpg`, with its caption in the manifest for that app (`manifest-desktop.json` and so on in the working folder). `build.js` puts every screen named in `catalog.json` on the page, under its section, in the apps that have a picture of it.

## Adding a screen

1. Give it an id and a name in `catalog.json` (`"R14": "Play it in another key"`): the next free number in its section. If the same screen is in more than one app, it has the same id in each.
2. Add the step that opens it and takes the picture:
   - desktop, in `desktop.js`: `await dialog('#someButton', 'R14', 'Caption', 'someDialog');` for a button that opens a dialog, or `await safe('R14', async () => { …; await shot('R14', 'Caption'); });` for anything else;
   - web player, in `web.js`: `await dlg('#someButton', 'R14', 'Caption');` or the same `safe(…)` form.
   Close what you opened at the end of the step, so the next one starts from a clean screen.
3. Run just that section: `npm run ui-review -- desktop R`.

If the app changes so a step no longer works (a button renamed, say), the run doesn't stop: it prints `!! R14: …` and goes on. Fix the step and run that section again.

## For AI assistants

When you change a screen, run the review for it, and add new screens as above (see `AGENTS.md` in the project folder). Keep ids stable: a screen keeps its id when it changes, so reviews from different versions can be compared.
