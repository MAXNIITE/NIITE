# NIITE — APK

NIITE ni app ya Android iliyojengwa kwa **Capacitor**: HTML, CSS na JavaScript
zote zimefungwa **ndani** ya APK. App haifungui tovuti yoyote — inafanya kazi
kutoka kwenye simu yenyewe, na inazungumza moja kwa moja na Supabase.

Hakuna kitu cha Vercel kinachohitajika kwa APK hii.

---

## Njia 1 — GitHub Codespaces (bila kuinstall kitu kwenye kompyuta yako)

Codespaces huja na Node, Java 17 na Android SDK tayari.

1. Fungua https://github.com/MAXNIITE/NIITE
2. Bonyeza kitufe cha kijani **Code** → tab **Codespaces** → **Create codespace on main**
3. Subiri sekunde 30–60 ikifungua
4. Kwenye terminal (chini ya screen), weka amri hizi moja moja:

```
npm install
mkdir -p www
cp index.html styles.css app.js config.js manifest.json www/
npx cap add android
npx cap sync android
cd android && chmod +x gradlew && ./gradlew assembleDebug
```

5. Build ikiisha, APK iko hapa:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

6. Kwenye file explorer ya kushoto, fungua folder hiyo → **right-click** kwenye
   `app-debug.apk` → **Download**

Hiyo ni APK yako. Iinstall kwenye simu, ifungue, na inafanya kazi.

---

## Njia 2 — Android Studio (kompyuta yako)

1. Install https://developer.android.com/studio
2. Clone repo: `git clone https://github.com/MAXNIITE/NIITE.git`
3. Kwenye terminal ya folder hiyo:

```
npm install
mkdir -p www
cp index.html styles.css app.js config.js manifest.json www/
npx cap add android
npx cap sync android
npx cap open android
```

4. Android Studio inafunguka → **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
5. APK iko kwenye `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Njia 3 — GitHub Actions (ikisharuhusiwa)

Faili la workflow iko kwenye `github-workflow-android.yml` (nje ya `.github/`).
Kuiawasha:

1. Unda folder `.github/workflows` kama haipo
2. Hamisha `github-workflow-android.yml` ndani yake, ubadilishe jina kuwa `android.yml`
3. Commit. Kila push itajenga APK, na unaipakua kutoka tab **Actions** → run ya
   mwisho → **Artifacts** → `niite-apk`

---

## Kubadilisha app

Baada ya kubadilisha `index.html`, `app.js`, `styles.css` au `config.js`:

```
cp index.html styles.css app.js config.js manifest.json www/
npx cap sync android
cd android && ./gradlew assembleDebug
```

Kumbuka: `www/` ina nakala ya faili — ndiyo inayofungwa ndani ya APK.

---

## Database

Supabase project: `ihrlcoyijrtxwleongdl`
Tables: `mafundi`, `maombi`
Connection iko kwenye `config.js` (anon key — salama kwenye app, RLS inalinda).

NIITE — bidhaa ya WellXAI.
