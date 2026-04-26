export interface Extra {
  name: string;
  points: number;
}

export interface Activity {
  name: string;
  points: number;
  extras?: Extra[];
}

export interface Category {
  name: string;
  activities: Activity[];
}

export const categories: Category[] = [
  {
    name: 'Mad',
    activities: [
      {
        name: 'Bolle med ost',
        points: 10,
        extras: [
          { name: 'Surdej', points: 5 },
          { name: 'Gammel knas', points: 5 },
          { name: 'Pisket smør', points: 5 },
          { name: 'Plain', points: 0 },
        ],
      },
      {
        name: 'Fastelavnsbolle',
        points: 10,
        extras: [
          { name: 'Juno', points: 5 },
          { name: 'Anderson', points: 5 },
          { name: 'Hart', points: 5 },
          { name: 'La Glace', points: 5 },
          { name: 'Føtex', points: -5 },
          { name: 'Plain', points: 0 },
        ],
      },
      {
        name: 'Kardemommesnurre',
        points: 10,
        extras: [],
      },
      {
        name: 'Kebab på Nørrebro',
        points: 10,
        extras: [],
      },
      {
        name: 'Avocadomad',
        points: 10,
        extras: [],
      },
    ],
  },
  {
    name: 'Drikke',
    activities: [
      {
        name: 'Vin',
        points: 10,
        extras: [
          { name: 'Naturvin', points: 5 },
          { name: 'Orange vin', points: 5 },
          { name: 'På vinbar', points: 5 },
        ],
      },
      { name: 'Kombucha', points: 10 },
      {
        name: 'Matcha',
        points: 10,
        extras: [
          { name: 'På havremælk', points: 5 },
          { name: 'Iced', points: 5 },
        ],
      },
      {
        name: 'Kaffe',
        points: 10,
        extras: [
          { name: 'Flat white', points: 5 },
          { name: 'Cortado', points: 5 },
          { name: 'Om søerne', points: 5 },
          { name: 'Iced', points: 5 },
        ],
      },
      {
        name: 'Drinks',
        points: 10,
        extras: [
          { name: 'Negroni', points: 5 },
          { name: 'Espresso martini', points: 5 },
          { name: 'Vermouth Tonic', points: 5 },
          { name: 'Amaretto sour', points: 5 },
          { name: 'Dirty Martini', points: 5 },
        ],
      },
    ],
  },
  {
    name: 'Træning/Sport',
    activities: [
      {
        name: 'Løb',
        points: 10,
        extras: [
          { name: 'I løbeklub', points: 5 },
          { name: 'Løbevest', points: 5 },
          { name: 'Hurtigbriller', points: 5 },
          { name: 'Tracked på Strava', points: 5 },
          { name: 'Om søerne', points: 5 },
        ],
      },
      {
        name: 'Bouldering',
        points: 10,
        extras: [
          { name: 'Egne sko', points: 5 },
          { name: 'Egen kalk', points: 5 },
          { name: 'Bar overkrop', points: 5 },
        ],
      },
      {
        name: 'Pilates',
        points: 10,
        extras: [
          { name: 'Reformer', points: 5 },
          { name: 'Heated', points: 5 },
          { name: 'Lagree', points: 5 },
          { name: 'Måtte', points: 0 },
        ],
      },
      {
        name: 'Sauna',
        points: 10,
        extras: [
          { name: 'Coldplunge', points: 5 },
          { name: 'Gus', points: 5 },
        ],
      },
      {
        name: 'Padel',
        points: 10,
        extras: [
          { name: 'Med mellemlederen', points: 5 },
          { name: 'Eget bat', points: 5 },
        ],
      },
    ],
  },
  {
    name: 'Main Character Moments',
    activities: [
      { name: 'Solnedgang på Dronning Louises Bro', points: 10 },
      { name: 'Læs bog på offentlig bænk', points: 10 },
      { name: 'Skrive dagbog på cafe', points: 10 },
      { name: 'En tur på en omnium', points: 10 },
      {
        name: 'Gå en tur om søerne',
        points: 10,
        extras: [
          { name: 'På en date', points: 5 },
          { name: 'Med kaffe', points: 5 },
          { name: 'Bare en gåtur', points: 0 },
        ],
      },
      {
        name: 'Tanning',
        points: 10,
        extras: [
          { name: 'La Banchina', points: 5 },
          { name: 'Islands Brygge', points: 5 },
          { name: 'Broens Gadekøkken', points: 5 },
          { name: 'Kongens Have', points: -5 },
        ],
      },
      {
        name: 'I byen',
        points: 10,
        extras: [
          { name: 'Hangaren', points: 5 },
          { name: 'Bodega Dansa', points: 5 },
          { name: 'Sø', points: 5 },
          { name: 'Sigurdsgade', points: 5 },
          { name: 'Kødbyen', points: 5 },
          { name: 'Blågårdsgade', points: 5 },
          { name: 'Alexandra Hus', points: 5 },
        ],
      },
    ],
  },
];
