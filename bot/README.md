# Ball of Duty HQ Discord bot

A bot a kijelölt Discord-csatornák natív szavazásait szinkronizálja a Firebase Realtime Database-be.

## Helyi beállítás

1. Másold le a `.env.example` fájlt `.env` néven.
2. Írd be a Discord bot tokenjét a helyi `.env` fájlba.
3. A Firebase Console **Project settings → Service accounts** oldalán generálj egy új privát kulcsot.
4. A letöltött JSON fájlt helyezd el `bot/serviceAccountKey.json` néven.
5. A `.env` fájlban a `GOOGLE_APPLICATION_CREDENTIALS` értéke legyen ennek a fájlnak az abszolút elérési útja.
6. Telepítés: `npm install`
7. Indítás: `npm start`

Sem a `.env`, sem a `serviceAccountKey.json` nem kerülhet Gitbe.

## Firebase adatok

- `discordPolls/{messageId}`: poll metaadatai és válaszlehetőségei
- `discordVotes/{messageId}/{discordUserId}`: a felhasználó kiválasztott válaszai

A bot induláskor csatornánként az utolsó 100 üzenetet vizsgálja át, majd valós időben figyeli az új pollokat és a szavazatváltozásokat.
