# NIITE — APK

NIITE ni app ya Android iliyojengwa kwa **Capacitor**: HTML, CSS na JavaScript
zote zimefungwa **ndani** ya APK. App haifungui tovuti yoyote — inafanya kazi
kutoka kwenye simu yenyewe, na inazungumza moja kwa moja na Supabase.

Hakuna kitu cha Vercel kinachohitajika kwa APK hii.

---

## Njia 1 — GitHub Codespaces (rahisi zaidi, dakika ~5)

Codespaces ina Node, Java 17 na Android SDK tayari. Hakuna kuinstall kitu
kwenye kompyuta yako.

1. Fungua https://github.com/MAXNIITE/NIITE
2. Bonyeza **Code** → tab **Codespaces** → **Create codespace on main**
3. Subiri sekunde 30–60 ikifungua
4. Kwenye terminal (chini ya screen), weka amri mbili hizi:

```
npm install
npm run apk
```

5. Build inachukua dakika 2–5 (mara ya kwanza Gradle inapakua vitu).
   Ikisha, APK iko hapa:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

6. Kwenye file explorer ya kushoto, fungua `android/app/build/outputs/apk/debug/`
   → **right-click** kwenye `app-debug.apk` → **Download**

Hiyo ni APK yako. Iinstall kwenye simu (unahitaji kuruhusu "install from unknown
sources"), ifungue, na inafanya kazi.

---

## Njia 2 — Android Studio (kompyuta yako)

1. Install https://developer.android.com/studio
2. `git clone https://github.com/MAXNIITE/NIITE.git`
3. Kwenye terminal ya folder hiyo:

```
npm install
npm run sync
npx cap open android
```

4. Android Studio inafunguka → **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
5. APK iko kwenye `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Njia 3 — GitHub Actions (kila push inajenga APK)

Faili la workflow iko kwenye `github-workflow-android.yml` (mzizi wa repo).

1. Unda folder `.github/workflows` kama haipo
2. Hamisha `github-workflow-android.yml` ndani yake, ubadilishe jina → `android.yml`
3. Commit. Kila push itajenga APK
4. Pakua kutoka tab **Actions** → run ya mwisho → **Artifacts** → `niite-apk`

*(Ushauri: hamisha faili hili mwenyewe kupitia UI ya GitHub — "Add file" →
"Create new file" → weka jina `.github/workflows/android.yml` → nakili maudhui.)*

---

## Amri muhimu

| Amri | Inafanya nini |
|---|---|
| `npm install` | Inapakua dependencies |
| `npm run sync` | Inanakili faili za app kwenda `www/` na kusync na Android |
| `npm run apk` | Inanakili, inasync, na kujenga APK |
| `npx cap open android` | Inafungua Android Studio |

Baada ya kubadilisha `index.html`, `app.js`, `styles.css` au `config.js`,
weka tena `npm run apk` — script inanakili faili mpya ndani ya APK yenyewe.

---

## Database

- Supabase project: `ihrlcoyijrtxwleongdl`
- Tables: `mafundi` (mafundi wote), `maombi` (maombi ya wateja)
- Connection iko kwenye `config.js` — anon key, salama kwenye app kwa kuwa
  Row Level Security inalinda data kwenye database yenyewe.

Mafundi hujisajili kutoka ndani ya app, na kila ombi la mteja linaingia kwenye
table `maombi` kisha linafungua WhatsApp ya fundi anayelingana.

---

NIITE — bidhaa ya WellXAI.
