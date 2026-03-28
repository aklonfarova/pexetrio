# Kladenské Pexetrio 🗺️

Multiplayer webová hra pro dva hráče v reálném čase – variace na pexeso, kde se hledají **trojice** karet. Tematický okruh: **Kročehlavy, Kladno** – ulice pojmenované po světových státech.

🎮 **Zahraj si online:** [https://kladenske-pexetrio.onrender.com](https://kladenske-pexetrio.onrender.com)

---

## O hře

Každá trojice se skládá ze tří karet jednoho státu:

| Karta | Popis |
|-------|-------|
| **Vlajka** | Státní vlajka daného státu |
| **Obrys** | Geografický obrys (silueta) státu |
| **Ulice** | Ulice v Kročehlavech pojmenovaná po daném státu |

### Státy v sadě (12 trojic = 36 karet)

| Stát | Ulice v Kročehlavech |
|------|----------------------|
| USA | Americká |
| Arménie | Arménská |
| Bulharsko | Bulharská |
| Francie | Francouzská |
| Itálie | Italská |
| Maďarsko | Maďarská |
| Německo | Německá |
| Norsko | Norská |
| Polsko | Polská |
| Rumunsko | Rumunská |
| Rusko | Ruská |
| Slovensko | Slovenská |

---

## Herní pravidla

1. Hráč otočí **tři karty** za tah.
2. Patří-li všechny tři k jednomu státu → zůstávají otočené, hráč získá **1 bod** a hraje **znovu**.
3. Neshodují-li se → karty se po 1,5 s otočí zpět a hraje **soupeř**.
4. Hra končí, když jsou nalezeny všechny trojice. **Vítěz** má více bodů.

---

## Technologie

| Část | Technologie |
|------|-------------|
| Backend | Node.js, Express |
| Real-time | Socket.io (WebSockets) |
| Frontend | Vanilla JS, CSS3 (3D flip animace) |
| Vlajky | [flagcdn.com](https://flagcdn.com) |
| Hosting | [Render.com](https://render.com) |

---

## Lokální spuštění

```bash
# 1. Naklonuj repozitář
git clone https://github.com/aklonfarova/pexetrio.git
cd pexetrio

# 2. Nainstaluj závislosti
npm install

# 3. Spusť server
npm start
# nebo pro vývoj:
npm run dev

# 4. Otevři v prohlížeči
# http://localhost:3000
```

---

## Nasazení na Render

1. Pushni kód na GitHub.
2. Jdi na [render.com](https://render.com) → **New Web Service**.
3. Připoj GitHub repozitář.
4. Render automaticky detekuje `render.yaml` a aplikaci nasadí.

Nebo klikni na tlačítko:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## Struktura projektu

```
pexetrio/
├── server.js           # Express + Socket.io server, herní logika
├── package.json
├── render.yaml         # Konfigurace pro Render.com
└── public/
    ├── index.html      # Jednostránková aplikace
    ├── css/
    │   └── style.css   # Responzivní styly, CSS 3D animace
    └── js/
        ├── cards-data.js  # Data karet (SVG obrysy, kódy vlajek)
        └── app.js         # Klientská logika, Socket.io
```

---

## Screenshoty

*(Přidej screenshoty hry po nasazení)*

---

## Poznámky k rozšíření

- Karty typu **Ulice** v aktuální verzi zobrazují stylizovanou ceduli. Pro produkční verzi doporučujeme doplnit reálné fotografie ulic z Kročehlav.
- SVG obrysy států jsou zjednodušené polygonální aproximace. Pro přesnější obrysy lze nahradit daty z [Natural Earth](https://www.naturalearthdata.com/).

---

*Projekt vznikl jako školní práce – Kladno, Kročehlavy 2024.*
