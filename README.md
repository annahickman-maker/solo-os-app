# Set up Solo OS on this computer

**For the coding agent receiving this GitHub link.** The person in front of you is a Solo OS member setting up their own private Solo OS workspace, running entirely on their own computer: the app's source code, the workspace itself, and a key that only their computer holds. Nothing is rented and no domain is needed. They may never have used a terminal. You are their guide for the whole setup. The desktop app is called **Solo Command Centre**; Solo OS is the whole system, including the dashboard in their browser.

This is the place to start. A workspace set up this way is reachable from this computer only. If they are joining a workspace someone else set up, skip to **Joining with an invite**.

Which computers, and what to tell the person about theirs before you begin. The right-hand column is for you. Say only what is in **What to say**, in your own plain words; do not talk about how this guide was built or tested.

| Computer | Where it stands |
| --- | --- |
| Mac with Apple silicon | Fully supported. **What to say:** their Mac is ready for this, and nothing more about it. |
| Mac with an Intel processor | The same steps with one difference, marked **On an Intel Mac**: the Docker download in step 2. Fewer people have run this on an Intel Mac. **What to say:** their Mac works with this, one download differs, and it is a newer route, so you may need to solve a snag together. |
| Windows 10 or 11, 64-bit | The steps marked **On Windows**. Expect to solve a snag or two together. On Windows the app offers **Goose** and **Pi** agents only: Claude and Codex agents are switched off outside macOS and Linux, in Buzz itself as well as in Solo OS. Say so before they plan around a Claude or ChatGPT subscription, and before they plan to run the Solo OS Manager, which runs on Claude. **What to say:** Windows works with this and is the newest route, so expect to solve a snag or two together; and which agents they can use. |

How to guide:

- Run every command yourself, in a local session on their computer: Terminal on a Mac, PowerShell on Windows. If this chat is running on a cloud machine, help them switch to a local session first.
- Commands are written for a Mac. On Windows, type `node` wherever this guide writes `bin/node`; anything else that differs is marked **On Windows** or **On an Intel Mac**.
- Open by telling them the plan: six steps, you do most of them, and they do a few small things (get Docker ready, create their key, approve one prompt from their computer, sign in to Claude or Codex).
- Give one step at a time. Say which step it is ("Step 3 of 6"), what it does in plain words, and wait for their result before the next.
- Use plain names, and teach the real term once: "your workspace", "Docker (the program that quietly runs your workspace's storage in the background)", "your key (it proves you are you, with no account or password)", "an AI employee (an agent that works for you inside Solo OS)".
- When a step finishes, say what they now own.
- Whenever you send them to a website or a window, give the direct link and say exactly where to click, in order.
- Whenever they need to paste something you produced, print all of it in its own code block at that moment. Never shorten it with "..." or point back to an earlier message.
- Never ask for, read or print a private key, a password, a recovery copy, the workspace's settings file or a backup's contents. A private key starts with `nsec`. The only key they share with you starts with `npub`. Never read their clipboard either: some steps pass a secret through it precisely so that you never see it.

They need about 20 GB of free disk on a Mac, or about 35 GB on Windows, where the build tools are larger. Check before you start (`df -h ~` on a Mac). If there is less, stop and help them free space first: a build that runs out of disk stops partway.

That figure is space, not a download, and say so, because people hear "20 GB" as hours of waiting. On a Mac about 6 GB is downloaded in total (the source code, the build tools and libraries, and the workspace software); the rest, about 13 GB, is made on their own computer while the app is built and uses no internet. Tell them the downloads run in the background while they do their part, that a slow connection only makes this first setup longer, and that nothing is downloaded again afterwards. Once the app is installed, offer to delete the build's working files (the `target` folder in their copy of the source) to give most of that space back; the app itself is about half a gigabyte. If they later update, the build makes those files again.

## Step 1 of 6 · Start building the app

Find the newest Solo OS release and fetch only that revision into a fresh folder: the project's whole history is large and is not needed. Releases are tags named `soloos-v` and a version number.

```sh
git ls-remote --tags --refs https://github.com/annahickman-maker/solo-os-app.git 'soloos-v*'
```

Pick the highest version it lists, then:

```sh
git clone --depth 1 --branch soloos-vX.Y.Z https://github.com/annahickman-maker/solo-os-app.git "$HOME/Solo OS source"
cd "$HOME/Solo OS source"
```

Tell them this folder is their own copy of the app's source code.

Check `xcode-select -p`. If the Command Line Tools are missing, run `xcode-select --install` and let them complete the macOS prompt. Then start the build in the background and move on while it runs. It takes about twenty minutes on a recent Mac, longer on a slow connection:

```sh
bin/rustup toolchain install && ./scripts/soloos-build.sh
```

The same command works on an Intel Mac.

**On Windows:** the pinned tools in `bin/` do not run on Windows, so install the build tools first. Each one may show a Windows permission window, which they approve. Git comes first, because it fetches the repository:

```powershell
winget install --id Git.Git -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install --id Rustlang.Rustup -e
```

Node is the exception. This repository pins Node 24.18.0 and has only been built with it, while winget's current Node is newer. Give them this link to the official installer and let them run it: https://nodejs.org/dist/v24.18.0/node-v24.18.0-x64.msi

Open a new PowerShell window so the new tools are found, and check that `node --version` reports `v24.18.0`. Clone as above, then start the build in the background from the repository folder:

```powershell
node scripts/soloos-build.mjs
```

## Step 2 of 6 · Get Docker ready

The workspace keeps its messages and files in a database and a file store. Docker Desktop is the program that runs those in the background on their computer. They never have to open it or understand it: its whale icon in the menu bar means the workspace is on.

If Docker Desktop is not installed, they install it from https://www.docker.com/products/docker-desktop/. On a Mac they choose **Download for Mac - Apple Silicon**, open the downloaded file and drag **Docker** to **Applications**.

**On an Intel Mac:** the download is **Download for Mac - Intel Chip**. Everything after it is the same.

**On Windows:** they choose **Download for Windows - AMD64**, run the installer, approve the Windows permission window and keep **Use WSL 2 instead of Hyper-V** ticked. Windows may ask to restart or sign out. If Docker then says WSL needs installing or updating, run `wsl --update` in an administrator PowerShell and let them approve it. The whale icon lives in the system tray at the bottom right, sometimes behind the **^** arrow.

They open Docker Desktop once. Accepting Docker's terms is theirs to do; it is free for personal use and small businesses, and the terms shown say exactly who. They can keep the recommended settings and skip signing in: no Docker account is needed. Button names change between versions, so read the window with them.

Then two settings on one page, so the workspace comes back by itself after the computer restarts and Docker stays out of their way. In Docker's window: the **gear icon** at the top right, then **General**, then tick **Start Docker Desktop when you sign in to your computer**, untick **Open Docker Dashboard when Docker Desktop starts**, then **Apply**. With the second one off, Docker starts quietly in the background and only its whale icon shows.

Say why before you ask, in one sentence: "Your workspace lives inside Docker, so if Docker is not running, the app cannot find your workspace. This setting starts Docker by itself whenever you turn your computer on, so your workspace is always there when you open Solo OS." It is a recommendation, not a requirement. If they would rather not, carry on: tell them their workspace will be off after a restart until they open Docker themselves, and that opening Docker is all it takes to bring it back.

Fetch the workspace software (about 1.3 GB, once). It is safe to run before a key exists, and it tells you if the start-at-login setting is still off:

```sh
bin/node scripts/soloos-local/setup.mjs
```

## Step 3 of 6 · Create the owner's key

When the build finishes, install the app. If Applications already contains `Solo Command Centre.app`, check its identifier is `com.soloos.app` (`mdls -name kMDItemCFBundleIdentifier "/Applications/Solo Command Centre.app"`) and move the old bundle aside first. Use the user's own Applications folder (`~/Applications`) if the system one needs an administrator.

```sh
app="Solo Command Centre.app"
bundle="target/debug/bundle/macos/$app"
codesign --verify --deep --strict "$bundle" &&
  ditto "$bundle" "/Applications/$app" &&
  codesign --verify --deep --strict "/Applications/$app"
```

**On Windows:** the build leaves one installer in `target\debug\bundle\nsis`. Start it for them with `Start-Process (Get-ChildItem target\debug\bundle\nsis\*.exe).FullName`. The app was built on their own computer and carries no publisher's signature, so Windows may show **Windows protected your PC**: they choose **More info**, then **Run anyway**. The app is then in the Start menu as **Solo OS**.

Solo Command Centre is a separate app from Buzz: it keeps its own key, agents and settings, so it never shares them with a Buzz app on the same computer.

Tell them where the icon is and let them open it. The first time, macOS may say the app was downloaded or is from an unidentified developer; it was built on this Mac, so they choose **Open** (or **System Settings, Privacy & Security, Open Anyway**). They choose **Set up my workspace**, then **Create my key**. The next screen shows a code with a **Copy** button. Ask them to paste it to you. It is their public key and starts with `npub1`. Their private key is never shown: it stays in their Mac's Keychain, or in Windows Credential Manager.

## Step 4 of 6 · Start the workspace

Before you run the command, tell them what is about to happen: "Your computer will ask you to approve one thing. The connection between the app and your workspace is encrypted even though both are on this computer, and you are being asked to trust the certificate that does it. The certificate was just made on your computer, and the key that could make another one has already been deleted." On a Mac the window asks for their password or Touch ID. **On Windows** it is a **Security Warning** about installing a certificate named *Solo OS on this computer*, and they choose **Yes**. They approve it themselves.

Create the workspace with their public key as its owner:

```sh
bin/node scripts/soloos-local/setup.mjs npub1...
```

The command starts the workspace and checks it from this computer: the address must answer as this workspace, refuse an anonymous read and hide its operator routes. If it stops, fix what it reports and run the same command again. It never replaces an existing workspace's owner.

The workspace answers on port 18490. If that port is taken, the command says so; run it again with `SOLOOS_PORT` set to a free port, such as `SOLOOS_PORT=18491 bin/node scripts/soloos-local/setup.mjs npub1...`. The port it used is saved, so later runs keep it.

## Step 5 of 6 · Walk in

Give them the address the command printed, in its own code block. It is `https://localhost:18490` unless the command said otherwise. They paste it in the app, still open on **Connect your workspace**, and choose **Connect**. They complete their name and picture.

Do not stop to ask whether they are the owner. The workspace lets in only the key it was started with until they invite someone, and the command already checked that key, so anyone who gets in is the owner. When they say they are in, tell them their name is marked **Owner** in the members list, as something good to see, and carry straight on. If the app says the workspace needs an invite or will not connect, the app is holding a different key from the code they pasted to you: have them copy the code from the app again and compare it with the owner the command printed.

Then have them give the workspace a name, because until they do the app calls it by its address, `localhost:18490`. In the app: **Settings, Local settings, Display name**. Their business name works well. Only they see this name, and they can change it whenever they like.

Then, before anything else:

1. **Back up their key.** Say it this way: "The key you made on the Create my key screen is how you sign in as the owner. It only exists on this computer. If this computer is lost or replaced and you have no backup, nobody can get you back in." In the app they open **Settings, Identity**, find **Private key**, choose **Copy private key**, and paste it straight into their password manager. It starts with `nsec`. It must never be pasted into this chat.
2. **Make the first backup.** Run the command under **Backups** below and tell them where the folder is.
3. **Write their ownership note.** Create `My Solo OS.md` beside this checkout listing: the workspace address; where the source code is and the release tag built; that the workspace runs in Docker on this computer under the name `soloos`; that its settings and certificate are in `~/Library/Application Support/Solo OS Local Workspace` on a Mac or `%LOCALAPPDATA%\Solo OS Local Workspace` on Windows; where backups go; that the owner key is in the Keychain or Credential Manager with a recovery copy they saved; that the certificate lasts about two years and running the step 4 command renews it. No secrets go in this file.

They now own a working workspace and can hire their first AI employee.

## Step 6 of 6 · Hire the Solo OS Manager

The Solo OS Manager is their first AI employee: it runs on Claude (agent type `buzz.claude-code/claude-code`) or Codex (`buzz.codex/codex`), whichever they already pay for, and helps them set up everything else in Solo OS. They hire it on the **Team** page in the app, with the access link from the Manager's lesson in their Solo OS course. Ask them to have that link ready; it starts `https://solo-os-team.` and they paste it into the app, never into this chat.

**First, the harness.** An AI employee needs a harness, the AI tool it runs on. Employees use **Claude** (a Claude Pro or Max plan) or **Codex** (a ChatGPT plan that includes Codex), on the subscription they already pay for. Ask which they have. In the app they open **Settings, Agent setup, Harness defaults** and pick **Claude** or **Codex**. Two buttons then appear beside it, one after the other:

1. **Install integration** downloads the app's own copy of Claude Code (about 250 MB, once).
2. **Sign in** opens Claude's own sign-in page in their browser, where they sign in themselves with the account that has their subscription. If this computer is already signed in to Claude Code, this button never appears and they carry straight on.

Never ask for their Claude password or sign in for them. They do not need an API key: the key box in the same place is for people who would rather pay Anthropic per use.

For **Codex** the steps are the same under **Codex**: **Install integration** (about 130 MB), then **Sign in** with their ChatGPT or OpenAI account in their browser.

**Then, the Team page.** In the app they open **Team** in the dock. They paste the Manager's access link into **Access link** and choose **Unlock**. If they set up more than one harness, they pick **Claude** under **Hire as**. Then they choose **Employ me** on the Manager's card. The Manager appears under **Agents** with its name, picture and instructions, and they send it a first message. Other employees show **In training** until their lessons are released; each is hired the same way with the link from its own lesson.

When the Solo OS Manager has answered its first message, the setup is finished. Tell them that from here on they can ask the Manager for help inside Solo OS, including with updates and backups.

**On Windows:** Claude and Codex are not available, so the Manager cannot run there yet. They can hire **Goose** or **Pi** employees instead: Goose is included and needs a model provider's key in **Settings, Agent setup, Harness defaults, Goose**; Pi needs Node.js 22.19 or later and is turned on in **Settings, Plugins** first.

Agents run on this computer while Solo Command Centre is open. They work in `~/.buzz` by default and can run commands and edit files there.

## Keeping it running

The workspace is on whenever Docker is running, and survives the computer sleeping. If the app says it cannot reach the workspace:

1. Look for the whale icon. If it is missing, they open Docker Desktop (Applications on a Mac, the Start menu on Windows) and wait a minute.
2. If the app still cannot connect, run the step 4 command again with the same public key. It starts anything that stopped and repeats the checks.

## Backups

Say this plainly: "Everything in your workspace now lives on this computer. If it is lost and there is no backup, the workspace is gone." There are two things to keep safe, and they are separate:

- **The key** signs them in as owner. Its backup is the recovery copy in their password manager (step 5).
- **The workspace** is every message, channel and uploaded file. Its backup is a folder this command makes:

```sh
bin/node scripts/soloos-local/backup.mjs
```

The workspace pauses for a few seconds while the copy is taken. The folder appears in **Documents**, inside **Solo OS Backups**, named with the date. It is only a real backup once a copy is somewhere other than this computer: an external drive, or a cloud folder they trust. It holds the workspace's private settings and is not encrypted, so they keep it as private as the computer itself: in a cloud folder, that company can read it. Suggest a rhythm they will keep, such as every Friday, and offer to run it whenever they ask.

This is the simple backup, and it is enough to start with. Once the workspace holds work they would miss, set up **Encrypted backups, kept off this computer** below: one locked file that is safe to keep with a storage company, made every week without them.

A hired agent's own setup is kept by the app in the computer's own app data, not in this folder. A backup of the whole computer covers it: Time Machine on a Mac, or the backup tool they use on Windows.

To bring the workspace back on a new or wiped computer: do steps 1 and 2, then restore the newest backup folder and approve the certificate prompt as in step 4:

```sh
bin/node scripts/soloos-local/restore.mjs "/path/to/Solo OS backup 2026-11-14 0930"
```

They install the app as in step 3, choose **Set up my workspace**, then **Use an existing key**, and paste their recovery copy into the app (never into this chat). They connect to the same address as before. Restore refuses to run where a workspace already exists, so it can never overwrite one, and a restore that stops partway cleans up after itself, so it can simply be run again.

## Encrypted backups, kept off this computer

The recommended next step once the workspace is in real use. It is not part of the first setup. It replaces "remember to copy the folder somewhere" with one encrypted file, sent somewhere other than this computer, every week, by itself.

Tell them how it works before you start, in these words or your own: "Your backup gets locked with a backup key, which has two halves. The half that locks stays on this computer, so backups can run without you. The half that unlocks goes into your password manager and nowhere else: not on this computer, not in this chat. Anyone who gets the backup file without that half has nothing they can read. And if that half is ever lost, nobody can open your backups, including you and including me."

They need a password manager for this. If they do not use one, the Passwords app is on every Mac; on Windows, help them choose one they trust before you continue. A note or a text file is not a substitute.

Two secrets pass through their clipboard in this section, and you see neither. Never read the clipboard, never read the Keychain or Credential Manager, and never ask them to paste either secret into this chat. Each command below reads what it needs from the clipboard itself and then clears it.

**On Windows and on an Intel Mac** the commands are the same, with `node` for `bin/node` on Windows. Fewer people have run a whole encrypted backup and restore there, so run `offsite.mjs status` after the first scheduled backup and read the result with them.

This is a different key from the one that signs them in. Keep the names apart every time you speak: their **owner key** signs them in to the workspace (it starts `nsec`); their **backup key** opens backups (it starts `AGE-SECRET-KEY-1`). Both live in the password manager as separate entries.

### 1 · Make the backup key

Ask them to open their password manager and start a new entry named **Solo OS backup key**. Then run:

```sh
bin/node scripts/soloos-local/offsite.mjs key
```

The unlocking half is now on their clipboard and nowhere else. They paste it into the new entry and save it. The clipboard is cleared after three minutes; if they needed longer, run the command again for a fresh key.

Now prove the password manager really holds it. They copy the key back out of the entry they just saved, tell you it is copied, and you run:

```sh
bin/node scripts/soloos-local/offsite.mjs key --check
```

It compares the clipboard with the key that was made, then clears the clipboard. No encrypted backup can be made until this check passes, so a backup can never be locked with a key nobody kept.

### 2 · Choose where the copies go

Either of these, or both. Both is better: two places, run by two different companies.

**A cloud folder they already have** (iCloud Drive, Google Drive, Dropbox, OneDrive). The file is encrypted before it gets there, so that company stores a copy it cannot read. List what this computer has:

```sh
bin/node scripts/soloos-local/offsite.mjs folders
```

Choose one with them and give the command a folder inside it:

```sh
bin/node scripts/soloos-local/offsite.mjs folder "<the cloud folder>/Solo OS Backups"
```

Say the one limit: a copy only leaves this computer when their cloud app is running, signed in and has finished uploading. If that app is ever signed out, backups pile up on this computer and nothing warns them.

**On Windows** the same command lists OneDrive, iCloud Drive, Dropbox and the Google Drive drive letter when they are installed.

**Their own Cloudflare storage (R2)**. Copies are uploaded straight to a private bucket in their own Cloudflare account, with no cloud app in between. Tell them what Cloudflare asks first: a Cloudflare account, and adding R2 to it goes through a checkout that asks for a payment method, even though the first 10 GB stored each month are free. Storage beyond that costs $0.015 per GB each month (https://developers.cloudflare.com/r2/pricing/). A workspace's backups are usually far below 10 GB. If they would rather not give a payment method, use a cloud folder.

These are theirs to do, in https://dash.cloudflare.com under **Storage & databases, R2, Overview**. Menu names change, so read the page with them:

1. Add R2 to the account if the page asks, and complete its checkout.
2. **Create bucket**. Name it `soloos-backups` and keep the other settings as offered.
3. Back on the R2 overview, **API Tokens, Manage, Create Account API token** (**Create User API token** works the same if that is what their account offers). Permission: **Object Read & Write**. Under buckets choose **Apply to specific buckets only** and pick `soloos-backups`. Create it. The token can then touch that one bucket and nothing else in their account.
4. The next page shows its values once. They paste two of them to you, which are not secret on their own: the **Access Key ID**, and the endpoint, which looks like `https://<account id>.r2.cloudflarestorage.com`. They **copy** the **Secret Access Key** and tell you it is copied, without pasting it. It is not the line called Token value.

Then run, with the Secret Access Key still on their clipboard:

```sh
bin/node scripts/soloos-local/offsite.mjs r2 <endpoint> soloos-backups <access key id>
```

The command reads the secret from the clipboard and clears it, proves the token works by writing, reading, listing and deleting a small test file in the bucket, and only then keeps the secret in their Mac's Keychain, or in Windows Credential Manager. It is never written to a file. They do not need to save this secret anywhere else: on a new computer they simply create a new token for the same bucket.

### 3 · Make the first one, then put it on a schedule

```sh
bin/node scripts/soloos-local/backup.mjs --encrypted
```

The workspace pauses for a few seconds, as with the simple backup. The result is one file named with the date, ending `.tar.age`, in each place they chose.

Ask for a day and a time when their computer is usually on, then:

```sh
bin/node scripts/soloos-local/offsite.mjs schedule friday 13:00
```

From then on the backup makes itself every week. If the computer was asleep or off at that time, it runs the next time the computer is on. If Docker is not running, it starts Docker first. It keeps the newest eight backups in each place and removes older ones (`offsite.mjs keep <number>` changes that).

The command runs the scheduled backup once straight away and waits for it, so that anything the computer needs to ask is asked while they are sitting there. On a Mac this may be a question whether "node" may access files in the cloud folder: they choose **Allow**. If they choose otherwise, backups to that folder fail until they change it in **System Settings, Privacy & Security, Files and Folders**.

**On Windows** the schedule is a task named **Solo OS backup** in Task Scheduler. It runs while they are signed in, and a window may flash for a moment when it starts.

The schedule runs its own copy of these scripts, kept beside the workspace's settings, so it keeps working if this folder moves. After they update the source, run the schedule command again so it uses the new copy.

Whenever they ask whether backups are working, and at the start of any later session about the workspace, run:

```sh
bin/node scripts/soloos-local/offsite.mjs status
```

It shows what is set up, how many backups are in each place, when the last complete one was made, and the reason for the last failure if there was one. Nothing else tells them a backup failed, so read it to them plainly.

Add to `My Solo OS.md`: where encrypted backups go, the day and time, and that the backup key is the password manager entry **Solo OS backup key**. No secrets go in that file.

### Bringing the workspace back from an encrypted backup

On a new or wiped computer, do steps 1 and 2 of the setup. Then ask them to copy the **backup key** from their password manager and tell you it is copied.

From a cloud folder, once their cloud app has brought the file down:

```sh
bin/node scripts/soloos-local/restore.mjs "<the cloud folder>/Solo OS Backups/Solo OS backup 2026-11-14 1300.tar.age"
```

From Cloudflare, give this computer the bucket first: they create a new token as in step 2 and you run the `offsite.mjs r2` command. Then they copy the backup key, and:

```sh
bin/node scripts/soloos-local/restore.mjs --r2
```

That fetches the newest backup; add a file name after `--r2` for an older one. Either way the command reads the backup key from the clipboard, clears it, and tells you plainly if the key is not the one the backup was locked with or if the file is damaged, without changing anything. The same safety rules apply as for the simple restore: it refuses to run where a workspace already exists, and a restore that stops partway cleans up after itself.

They then approve the certificate prompt as in step 4, install the app as in step 3, choose **Use an existing key** and paste their **owner key** into the app. The restored workspace keeps using the same backup key; set the destination and the schedule again with the commands above.

### What to be honest about

- **Lose the backup key and the backups cannot be opened.** There is no reset and nobody to ask. That is what makes them safe to keep with a storage company.
- **It does not back up their owner key** or a hired agent's setup. Those are covered as described under **Backups**.
- **Someone who took over this computer could delete the copies**, in a cloud folder or in the bucket, because this computer is allowed to remove old backups. They could not read them.
- **The file does not depend on this project.** It is a standard age file holding a standard tar. With the backup key in a file, two free tools open it anywhere: `age -d -i key.txt "Solo OS backup ....tar.age" | tar -x`. Inside are the database (a PostgreSQL dump), the uploaded files, the git data and the workspace's settings.

## Updating to a newer version

For when they ask to update Solo OS. You may be their coding agent, or an AI employee they hired inside the app, such as the Solo OS Manager. The steps are the same; the one difference is marked **If you are running inside the app**.

The app never updates by itself. It stays on the version it was built from until they ask. Updating builds the app again from the newest Solo OS release tag: about as long as the first build, and about 13 GB of disk again if the build's working files were deleted. Their workspace, messages, key and agents are not touched: those live in Docker and in the app's own data, not in the app.

Open by telling them the plan: you check whether there is anything newer, make a backup, build the new app in the background while they keep working, and then they quit the app and open it again.

1. **Find their copy of the source.** Their ownership note, `My Solo OS.md`, names the folder. If you cannot find the note, look in their home folder for a folder containing `scripts/soloos-build.sh`. Run everything below from that folder.
2. **Check whether there is anything newer.** `git describe --tags` is the version they have. `git ls-remote --tags --refs origin 'soloos-v*'` lists the releases; the highest version is the newest. If they already have it, tell them they are up to date and stop. If `git status --porcelain` lists anything, stop and ask: their copy of the source has been edited.
3. **Check their key is backed up.** Ask them to confirm that their private key, the one starting with `nsec`, is saved in their password manager, as in step 5 of the setup. Do not ask to see it. The new app is a fresh build, so macOS may ask their permission before it lets the new app read the key the old one saved. With the recovery copy saved, the worst case is pasting the key back in.
4. **Back up the workspace.** Run the command under **Backups** and tell them where the folder is.
5. **Fetch the newer source and build it.** The build is the same command as step 1 of the setup, with the same **On Windows** difference. Start it in the background and tell them it takes about twenty minutes. Put the newest tag in place of `soloos-vX.Y.Z`:

   ```sh
   git fetch --depth 1 origin tag soloos-vX.Y.Z && git checkout soloos-vX.Y.Z
   bin/rustup toolchain install && ./scripts/soloos-build.sh
   ```

6. **Put the new app in place.** When the build finishes, check it, move the installed app aside and copy the new one in. The old app goes into their backups folder, so they can go back. They can leave the app open while you do this.

   ```sh
   app="Solo Command Centre.app"
   bundle="target/debug/bundle/macos/$app"
   installed="/Applications/$app"
   [ -d "$installed" ] || installed="$HOME/Applications/$app"
   kept="$HOME/Documents/Solo OS Backups/App before update $(date +%Y-%m-%d-%H%M).app"
   codesign --verify --deep --strict "$bundle" &&
     mkdir -p "$HOME/Documents/Solo OS Backups" &&
     mv "$installed" "$kept" &&
     ditto "$bundle" "$installed" &&
     codesign --verify --deep --strict "$installed"
   ```

   **On Windows:** have them close the app first, then run the new installer from `target\debug\bundle\nsis` as in step 3 of the setup. It installs over the old one.

7. **They restart the app.** Ask them to quit Solo Command Centre and open it again from Applications straight away. **If you are running inside the app,** say this first, because quitting stops you: "When you quit the app I will stop mid-sentence. That is expected, and the update is already installed. Open the app again and say hello to me."
8. **Check it came back.** When they are back in:
   - If macOS asked whether the app may use something saved in their keychain, they enter their Mac password and choose **Always Allow**.
   - If the app opens on its welcome screen instead of their workspace, they choose **Set up my workspace**, then **Use an existing key**, paste their recovery copy into the app (never into this chat), and connect to the same address as before.
   - Run the step 4 setup command again with their public key, which they copy from **Settings, Identity** (it starts with `npub1`). It brings the workspace's own software to the version this release uses and repeats the checks.
   - If an encrypted backup schedule is set up, run the schedule command again so it uses the new copy of the scripts.
9. **Tidy up.** Write the new version into `My Solo OS.md`. Offer to delete the build's working files to give the disk space back. Once they are happy with the new version, offer to delete the old app from their backups folder.

If the new app will not open or cannot reach the workspace, put the old one back: quit the app, move the new one out of Applications, and move the kept one back under its original name. Nothing in the workspace was changed by the update.

## Joining with an invite

Build and install the app as in steps 1 and 3; Docker is not needed to join someone else's workspace. The person opens Solo Command Centre, chooses **I have an invite**, pastes the invite link they were sent and chooses **Create my identity**, or **Use an existing key** if they already have one. Keep invites and recovery copies out of the chat. They save a recovery copy of their key from **Settings, Identity** as in step 5.

## Phones and teammates

A workspace on this computer cannot be reached from a phone or by a teammate on another computer. Moving a Solo OS workspace to a server is not part of this release. If they ask, say so plainly, and that their workspace and backups made now will be the starting point when it is.

## For developers

Solo OS is one build variant of [Buzz by Block](https://github.com/block/buzz-app) (Apache-2.0): the `soloos` Cargo feature, `VITE_SOLOOS_SELF_HOSTED=true` for the web side, and `src-tauri/tauri.soloos.conf.json`, all set by `scripts/soloos-build.mjs`. Without them this repository still builds plain Buzz. [UPSTREAM.md](UPSTREAM.md) explains how to merge a new Buzz release, lists every upstream file the variant touches, and explains how a Solo OS update feed would be added. Desktop builds also need the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/); see [contributing](docs/contributing.md) for development setup and tests.

- [Apache-2.0 license](LICENSE)
- [Source attribution](NOTICE.md)
- [Upstream and merging](UPSTREAM.md)
