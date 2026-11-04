# Your songs on the iPad, step by step

## First, the picture: two songbooks

There are **two separate songbooks**, and nothing joins them until you do:

| | Where it lives | What's in it |
|---|---|---|
| **The desktop songbook** | Your songs folder on the PC (a folder per song) | Everything: songs, their settings, notes, links, exports, history, setlists |
| **The iPad songbook** | Inside the web player on the iPad (the ukemusic Home Screen icon), stored on the iPad itself | Songs with their settings and notes, nothing else |

You're right that the iPad has its own songbook, and it has nothing to do with Dropbox. A song you add to it or change in it stays on the iPad until you send it somewhere.

Dropbox is **one of the ways to carry songs between the two**, not a third songbook. There are three ways:

| | Route 1: a file, by hand | Route 2: a file, kept in Dropbox | Route 3: Dropbox sync |
|---|---|---|---|
| Set up | Nothing | The Dropbox app on the iPad | Dropbox on the PC, a free Dropbox app key, ten minutes |
| Moving songs | You send one file each way when you want to | The same, but the file sits in Dropbox | Automatic, both ways |
| Good for | Starting out; now and then | Same, if you already use Dropbox | Every day |

**Start with route 1 or 2.** Move to route 3 when you're happy.

---

## Route 1 and 2: one file each way

The trick is to move **one file holding all your songs**, not single song files. A single `…-song.txt` comes without its `song.ini`, so the iPad doesn't get the song's tempo, time, key or strum. It's also hard to find among the PDFs and web pages in each song's folder.

### PC → iPad

1. In the **desktop app**, open the library and press **Phone and tablet… → Save songs for the web player…**
2. Save the file it offers, `ukemusic-web-songs.json`:
   - **Route 1:** into iCloud Drive (if iCloud for Windows is set up), or email it to yourself;
   - **Route 2:** into your Dropbox folder on the PC.
3. On the **iPad**, open ukemusic **from its Home Screen icon**. Don't use Safari: the icon and Safari keep separate songbooks.
4. Press **Add songs from files…** and find the file:
   - **Route 1:** in iCloud Drive, or in Mail (open the email, press and hold the file, **Save to Files**, then choose it from there);
   - **Route 2:** in Files → **Browse → Dropbox**. If Dropbox isn't listed, install the Dropbox app from the App Store, then in Files → Browse → ⋯ → **Edit**, turn Dropbox on.
5. ukemusic shows what's **new**, **changed** and **the same**. Press **Add**.

✓ **Check:** the songs are in the list, and a song plays at its own tempo (Higher Ground at 136).

### Changed songs on the PC since? Do the same again

Repeat steps 1–5. New songs are added and changed ones updated. A song you've changed on the iPad since is kept unless you say otherwise.

### iPad → PC

1. On the iPad, press **Back up all songs**. The share sheet opens:
   - **Route 1:** **Save to Files → iCloud Drive**, or **Mail** to yourself;
   - **Route 2:** **Save to Files → Dropbox**.

   The file is called `ukemusic songs <date>.json`.
2. On the PC, in the library, press **Phone and tablet… → Bring in songs from the web player…** and choose that file.
3. It lists the songs that are new or changed on the iPad, all ticked: untick any you don't want. A song you've changed on the PC since is left as it is.

✓ **Check:** the song opens on the PC with your change. Its earlier version is in **Changes…** (the song's history), in case you want it back.

### What you can't do with routes 1 and 2

- Nothing happens by itself: if you forget to send the file, the two songbooks drift apart.
- If the same song is changed on both, you choose which to keep when you bring it in.

---

## Route 3: Dropbox sync

Once it's set up, a change on the iPad is on the PC seconds later, and the other way round. The iPad songbook then **mirrors one folder in your Dropbox**: the desktop app's songs folder.

### Before you start

- **This costs nothing.** You need a free Dropbox account and a free "app key".
  - The app key is just a name Dropbox gives your copy of ukemusic so it's allowed to sign in. It isn't a paid developer account.
  - If a page asks for money, you're on the wrong page. Common ones are Dropbox's **Try Plus / Essentials** offers, **Dropbox Sign API** (a different product) and Apple's developer programme. Close it and use the address in step B1.
- Allow ten minutes, at the PC, with the iPad beside you.

### A. On the PC: put the songs folder in Dropbox

1. Copy your songs folder somewhere safe outside Dropbox, as a backup.
2. Install Dropbox for Windows (dropbox.com/install) and sign in. A free Basic account is fine.
3. Make a folder for your songs in Dropbox. Where it goes depends on the choice in B3:
   - **App folder** (recommended): it goes in `Dropbox\Apps\<your app's name>\`, which appears after step C2. Create the app first (B), connect the iPad once (C2), then come back to this step.
   - **Full Dropbox:** anywhere, e.g. `Dropbox\ukemusic songs`.
4. Move the **contents** of your songs folder into it: one folder per song, plus Setlists, Archived songs and practice.json.
5. In the **desktop app**: **Settings → Songs folder → Change…** and pick the new folder.

✓ **Check:** the library shows your songs, and they open.

### B. Make the app key (once, about five minutes)

1. Go to **https://www.dropbox.com/developers/apps** and sign in with the same Dropbox account.
2. Press **Create app**.
3. Choose **Scoped access**, then the type of access:
   - **App folder** (recommended): ukemusic can only see one folder, `Dropbox/Apps/<name>`, and nothing else in your Dropbox;
   - **Full Dropbox**: ukemusic can see your whole Dropbox, though it only ever opens the songs folder you choose.
4. Give it a name, e.g. `ukemusic-mark`. It must be unique on Dropbox. Press **Create app**.
5. Open the **Permissions** tab. Tick `files.metadata.read`, `files.metadata.write`, `files.content.read` and `files.content.write`, and press **Submit** at the bottom.
6. Open the **Settings** tab:
   - under **OAuth 2**, set **Allow public clients (Implicit Grant & PKCE)** to **Allow**;
   - under **Redirect URIs**, add `https://markbeachill.github.io/ukemusic/app/` and press **Add**. This is only needed for connecting from a Safari tab; the Home Screen icon uses a code instead.
7. Copy the **App key** from the Settings tab. It's about 15 letters and numbers. Ignore the App secret: ukemusic doesn't use it.

✓ **Check:** the app is listed at dropbox.com/developers/apps, status **Development**. That's normal, and is fine for you and up to 50 people.

### C. On the iPad: connect

1. Open ukemusic **from its Home Screen icon** and press **Dropbox…**
2. Paste the app key, and press **Connect with a code**:
   - Dropbox's page opens, so sign in and press **Allow**;
   - Dropbox shows a code: copy it, go back to ukemusic, paste it into **The code Dropbox shows you**, and press **Use the code**.
3. **If you chose App folder:** connecting makes the folder `Dropbox/Apps/<name>`. On the PC, go back to step A3, put the songs folder in it, and wait for Dropbox on the PC to finish syncing (its icon shows a tick). If the folder hasn't appeared a minute or two after connecting, make a new app with **Full Dropbox** instead.
4. In ukemusic's Dropbox dialog, open folders until you're **inside** the songs folder, the one with a folder per song. Press **Use this folder**.
5. It syncs. If it asks whether to add songs that are only on the iPad, read **Before the first sync** below first.

✓ **Check:** the Dropbox button says **Dropbox: synced** with the time, and your PC songs are in the list.

### Before the first sync: tidy the iPad songbook

Songs already in the iPad songbook (from routes 1 or 2, or written there) are matched to the Dropbox songs **by title**:

- **Same title, same song:** it's linked, and nothing changes.
- **Same title, but different** (you changed it, or it came in as a single text file without its settings): you get **two**, the Dropbox one and "… (changed on this device)".
- **Only on the iPad:** ukemusic asks once whether to add them to Dropbox.

So **before connecting**, delete from the iPad any song that's also on the PC and you haven't changed there. They'll come back from Dropbox, with their settings. Keep only songs that are new on the iPad, and say **OK** when it asks to add them.

### Every day

| You… | What happens | What you do |
|---|---|---|
| Change a song on the iPad | Sent to Dropbox about 8 seconds later, then to the PC | Wait for **synced** before closing the app |
| Change a song on the PC | Dropbox sends it up; the iPad brings it in when ukemusic opens or you come back to it | Nothing (or **Dropbox… → Sync now**) |
| Have a song open on the PC while changing it on the iPad | The PC doesn't notice. Saving on the PC replaces the iPad's change (it's kept in the song's history) | Close or reopen the song on the PC first |
| Change the same song on both before a sync | Both are kept: the PC's, and "… (changed on this device)" | Compare, keep one, delete the other |
| Delete a song on the iPad | Moved to **Archived songs** in Dropbox | Nothing: it's there if you want it back |
| Work with no connection | Changes are kept on the iPad and sent when you're back online | Nothing |

### What Dropbox sync carries, and what it doesn't

- **Carried, both ways:** each song's words and chords, its settings (`song.ini`: key, tempo, time, capo, strum…) and its notes.
- **Not carried:** links, exports (PDFs), history, setlists, trouble spots and practice progress. They stay on the PC. The iPad keeps its own trouble spots and practice progress.

---

## Questions

**Does connecting share my Dropbox with anyone?**
No. Nothing is shared with other people: Dropbox sharing is a separate thing you'd do yourself on dropbox.com.

Connecting lets **ukemusic on that iPad**, signed in as you, read and write files:
- with **App folder** access, only in `Dropbox/Apps/<name>`;
- with **Full Dropbox**, anywhere in your Dropbox, though ukemusic only lists folder names while you choose, then only touches the songs folder you picked.

The sign-in is kept on that iPad only. As the app's owner you can't see anyone else's files, and anyone who uses your key signs in to their own Dropbox. **Dropbox → Settings → Connected apps** on dropbox.com shows the connection and can remove it.

**Is the app key a secret?**
No. It names the app; it isn't a password. ukemusic never uses the App secret.

**Does it use one of my three free Dropbox devices?**
No. That limit counts Dropbox's own apps (the PC app, the Dropbox iOS app), not apps that connect to Dropbox like ukemusic.

**I deleted the Home Screen icon. Are my songs gone?**
The iPad songbook is, but with Dropbox sync everything is still in Dropbox: add the icon again and connect. Without it, only what you saved with **Back up all songs**.

**Can I use iCloud Drive instead of Dropbox for route 3?**
No. Apple doesn't let web apps reach iCloud Drive. Routes 1 and 2 work with iCloud Drive.
