// Card data shared client-side: flag CDN codes, SVG outlines, street names
// SVG paths use viewBox="0 0 200 150"

const CARDS_DATA = {
  usa: {
    name: 'USA',
    flag: 'us',
    street: 'Americká',
    outline: `M 12 28 L 95 22 L 160 22 L 182 36 L 184 56 L 172 52 L 158 58
              L 150 68 L 136 68 L 120 73 L 108 68 L 92 73 L 78 68 L 62 73
              L 46 68 L 30 73 L 16 67 L 8 58 Z`,
  },
  armenia: {
    name: 'Arménie',
    flag: 'am',
    street: 'Arménská',
    outline: `M 48 30 L 122 26 L 155 52 L 150 94 L 108 118 L 58 112 L 30 82 L 36 50 Z`,
  },
  bulgaria: {
    name: 'Bulharsko',
    flag: 'bg',
    street: 'Bulharská',
    outline: `M 25 28 L 145 22 L 172 44 L 168 92 L 118 112 L 70 114 L 28 98 L 16 72 L 20 46 Z`,
  },
  france: {
    name: 'Francie',
    flag: 'fr',
    street: 'Francouzská',
    outline: `M 55 8 L 118 6 L 152 28 L 162 70 L 140 114 L 95 132 L 52 124
              L 22 98 L 14 58 L 30 22 Z`,
  },
  italy: {
    name: 'Itálie',
    flag: 'it',
    street: 'Italská',
    outline: `M 64 4 L 85 3 L 91 18 L 98 34 L 112 52 L 128 80 L 142 112 L 144 132
              L 128 138 L 116 122 L 106 102 L 94 78 L 86 88 L 78 96 L 70 92
              L 76 74 L 70 58 L 62 42 L 56 24 Z`,
  },
  hungary: {
    name: 'Maďarsko',
    flag: 'hu',
    street: 'Maďarská',
    outline: `M 18 42 L 88 28 L 148 34 L 174 52 L 168 76 L 134 94 L 86 100 L 42 94 L 14 74 L 14 54 Z`,
  },
  germany: {
    name: 'Německo',
    flag: 'de',
    street: 'Německá',
    outline: `M 52 8 L 115 4 L 148 20 L 158 46 L 150 70 L 128 84 L 108 88
              L 85 92 L 60 86 L 40 72 L 32 50 L 36 24 Z`,
  },
  norway: {
    name: 'Norsko',
    flag: 'no',
    street: 'Norská',
    outline: `M 82 4 L 108 6 L 124 24 L 140 46 L 136 68 L 120 88 L 105 108
              L 95 136 L 85 138 L 76 118 L 78 92 L 72 68 L 60 52 L 65 28 L 76 12 Z`,
  },
  poland: {
    name: 'Polsko',
    flag: 'pl',
    street: 'Polská',
    outline: `M 35 14 L 145 12 L 158 28 L 154 86 L 138 104 L 94 108 L 58 102 L 32 90 L 24 68 L 28 38 Z`,
  },
  romania: {
    name: 'Rumunsko',
    flag: 'ro',
    street: 'Rumunská',
    outline: `M 28 16 L 125 12 L 165 36 L 172 78 L 155 104 L 108 118 L 65 116 L 30 98 L 18 68 L 22 38 Z`,
  },
  russia: {
    name: 'Rusko',
    flag: 'ru',
    street: 'Ruská',
    outline: `M 5 14 L 194 8 L 198 42 L 195 84 L 170 108 L 138 118 L 88 114 L 48 105 L 18 90 L 6 65 Z`,
  },
  slovakia: {
    name: 'Slovensko',
    flag: 'sk',
    street: 'Slovenská',
    outline: `M 20 46 L 108 34 L 168 40 L 180 60 L 170 78 L 108 86 L 35 74 L 16 60 Z`,
  },
};
