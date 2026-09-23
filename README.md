# NIITE — Pata Fundi wa Kila Aina

App ya kuunganisha mteja na fundi: umeme, maji, simu, useremala, kila aina. Mteja anatafuta, anaona mafundi, na kupiga WhatsApp moja kwa moja.

Kwa sasa inafanya kazi kwenye **https://niite.vercel.app** (tovuti/PWA), na mradi huu unaweza kujengwa kama **APK ya Android** app yenyewe — faili zote zimefungwa ndani, inasoma Supabase moja kwa moja, haitegemei Vercel.

---

## Kile kilichomo

| Faili | Kazi |
|---|---|
| `index.html` | Muundo wa app (screens, tab bar ya chini) |
| `styles.css` | Muonekano wa app ya mkononi |
| `app.js` | Mantiki yote: Supabase, utafutaji, fomu, WhatsApp |
| `config.js` | Supabase URL na anon key |
| `manifest.json` | Jina, rangi, icons za app |
| `sw.js` | Service worker (inaifanya ifanye kazi bila internet) |
| `package.json` | Capacitor + scripts za build |
| `capacitor.config.json` | Config ya Android (webDir: `www`) |
| `scripts/prepare-www.js` | Inanakili faili za app kwenye `www/` |
| `github-workflow-android.yml` | Workflow ya GitHub Actions (tazama chini) |

---

## Sehemu ya 1 — Endesha kwenye browser (kila kitu tayari)

```bash
npm install
npx serve .
```

Au fungua `index.html` moja kwa moja kwenye browser (haina build step).

---

## Sehemu ya 2 — Kupata APK (desktop inahitajika)

APK ni faili la Android. Kupata APK **lazima** kujengwa kwa Android SDK — hakuna njia ya kuepuka hilo. Kuna njia mbili; chagua moja.

### Njia A — Codespaces (rahisi zaidi, hakuna kuinstall kitu)

Inaendesha kwenye browser, kwenye kompyuta yenye Linux + Java 17 + Android SDK tayari.

1. Fungua https://github.com/MAXNIITE/NIITE
2. Bonyeza kitufe cha kijani **Code** → tab **Codespaces** → **Create codespace on main**
3. Subiri ~60 sekunde. Dirisha la VS Code linafunguka na terminal ya chini (`bash`).
4. Andika kwenye terminal:

```bash
npm install
npm run apk
```

5. Subiri dakika 5-10 (mara ya kwanza inapakua Gradle + dependencies).
6. Pakua APK: upande wa kushoto fungua
   `android` → `app` → `build` → `outputs` → `apk` → `debug` → **`app-debug.apk`**
   Right-click → **Download**.

### Njia B — Android Studio kwenye desktop

1. Pakua Android Studio bure: https://developer.android.com/studio
2. Install (inachukua ~10GB, inaweka Java na Android SDK yenyewe).
3. Fungua terminal kwenye folder ya mradi (Git Bash / Terminal):

```bash
npm install
npm run www
npx cap add android
npx cap sync android
npx cap open android
```

4. Android Studio inafunguka. Subiri "Gradle sync" ikamilike.
5. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
6. Bonyeza **locate** kwenye taarifa inayotokea. APK iko:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Kuinstall APK kwenye simu

1. Hamisha `app-debug.apk` kwenye simu (WhatsApp, USB, Google Drive — lolote).
2. Fungua faili hilo kwenye simu.
3. Android itaomba ruhusa **"Install unknown apps"** — idhinishe kwa app uliyotumia (mfano Chrome au Files).
4. Bonyeza **Install**. App **NIITE** inaonekana kwenye home screen.

### Kujenga APK kila push (GitHub Actions)

Faili la `github-workflow-android.yml` liko kwenye mzizi wa mradi kwa sababu bot ya ChatGiZa haiwezi kupush moja kwa moja ndani ya `.github/workflows/`. Ili kuiwasha:

1. Fungua https://github.com/MAXNIITE/NIITE
2. Bonyeza **Add file** → **Create new file**
3. Kwenye jina la faili andika: `.github/workflows/android.yml`
4. Fungua `github-workflow-android.yml`, nakili maudhui yote, na ubandike kwenye faili jipya
5. Bonyeza **Commit changes**
6. Kila push baada ya hapo inajenga APK. Pakua kutoka tab **Actions** → deployment → **Artifacts** → `niite-debug-apk`

---

## Sehemu ya 3 — PWA (bila APK, kwa simu moja kwa moja)

Kama hutaki APK, app inaweza kuwekwa kwenye home screen ya simu yoyote:

1. Fungua `https://niite.vercel.app` kwenye **Chrome ya Android**
2. Bonyeza menyu (vitone vitatu juu kulia)
3. Chagua **"Add to Home screen"** / **"Install app"**
4. App inaonekana kwenye home screen, inafunguka fullscreen, bila address bar

---

## Database (Supabase)

Project ref: `ihrlcoyijrtxwleongdl`

Tables mbili:

**`mafundi`** — jina, ujuzi, eneo, simu, kiwango, uzoefu, kuhusu, alama, kazi, created_at

**`maombi`** — mteja_jina, mteja_simu, huduma, eneo, maelezo, created_at

RLS imewashwa:
- `mafundi`: kusoma ni kwa wote (mtu yeyote anaweza kuona fundi); kuandika ni kwa mtumiaji aliyeingia
- `maombi`: kuandika ni kwa wote (mteja hatakiwi kuwa na akaunti); kusoma ni kwa mtumiaji aliyeingia

Credentials ziko `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

---

## Kumbuka kuhusu usalama

Key iliyo kwenye `config.js` ni **anon / public** key — hiyo ni sahihi kuwa kwenye app inayotumia browser. **Service role key isiwekwe kwenye faili hili kamwe** — hiyo ina mamlaka kamili juu ya database na haipaswi kufika kwa mtumiaji.
