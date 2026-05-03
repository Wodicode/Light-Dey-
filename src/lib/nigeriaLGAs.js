// Major Nigerian LGAs with coordinates and DisCo affiliation.
// Coordinates are approximate geographic centres.
export const NIGERIA_LGAS = [
  // ── Lagos State ──────────────────────────────────────────────────────────
  { id: 'lagos-ikeja',      name: 'Ikeja',              state: 'Lagos',       disco: 'IE',     lat: 6.6018, lng: 3.3515 },
  { id: 'lagos-alimosho',   name: 'Alimosho',           state: 'Lagos',       disco: 'IE',     lat: 6.5556, lng: 3.2508 },
  { id: 'lagos-agege',      name: 'Agege',              state: 'Lagos',       disco: 'IE',     lat: 6.6226, lng: 3.3237 },
  { id: 'lagos-oshodi',     name: 'Oshodi-Isolo',       state: 'Lagos',       disco: 'IE',     lat: 6.5485, lng: 3.3421 },
  { id: 'lagos-kosofe',     name: 'Kosofe',             state: 'Lagos',       disco: 'IE',     lat: 6.5750, lng: 3.4167 },
  { id: 'lagos-ikorodu',    name: 'Ikorodu',            state: 'Lagos',       disco: 'IE',     lat: 6.6194, lng: 3.5064 },
  { id: 'lagos-shomolu',    name: 'Shomolu',            state: 'Lagos',       disco: 'IE',     lat: 6.5407, lng: 3.3852 },
  { id: 'lagos-island',     name: 'Lagos Island',       state: 'Lagos',       disco: 'EKEDC',  lat: 6.4549, lng: 3.3942 },
  { id: 'lagos-etiosa',     name: 'Eti-Osa (VI / Lekki)',state: 'Lagos',      disco: 'EKEDC',  lat: 6.4403, lng: 3.5497 },
  { id: 'lagos-surulere',   name: 'Surulere',           state: 'Lagos',       disco: 'EKEDC',  lat: 6.4969, lng: 3.3553 },
  { id: 'lagos-apapa',      name: 'Apapa',              state: 'Lagos',       disco: 'EKEDC',  lat: 6.4530, lng: 3.3578 },
  { id: 'lagos-mainland',   name: 'Lagos Mainland',     state: 'Lagos',       disco: 'EKEDC',  lat: 6.5134, lng: 3.3783 },
  { id: 'lagos-mushin',     name: 'Mushin',             state: 'Lagos',       disco: 'EKEDC',  lat: 6.5266, lng: 3.3567 },
  { id: 'lagos-badagry',    name: 'Badagry',            state: 'Lagos',       disco: 'EKEDC',  lat: 6.4189, lng: 2.8881 },
  { id: 'lagos-epe',        name: 'Epe',                state: 'Lagos',       disco: 'EKEDC',  lat: 6.5881, lng: 3.9806 },

  // ── FCT / Abuja ── 6 Area Councils (NERC categorisation) ────────────────
  // AMAC covers: Garki, Wuse, Wuse 2, Maitama, Asokoro, CBD, Guzape,
  //              Jabi, Utako, Wuye, Life Camp, Lugbe, Durumi, Gwarinpa,
  //              Karu, Karmo, Kpeyegyi and surrounding districts.
  { id: 'fct-amac',       name: 'AMAC',        state: 'FCT', disco: 'AEDC', lat: 9.0579, lng: 7.4951 },
  { id: 'fct-bwari',      name: 'Bwari',       state: 'FCT', disco: 'AEDC', lat: 9.1556, lng: 7.3733 },
  { id: 'fct-gwagwalada', name: 'Gwagwalada',  state: 'FCT', disco: 'AEDC', lat: 8.9447, lng: 7.0832 },
  { id: 'fct-kuje',       name: 'Kuje',        state: 'FCT', disco: 'AEDC', lat: 8.8731, lng: 7.2256 },
  { id: 'fct-abaji',      name: 'Abaji',       state: 'FCT', disco: 'AEDC', lat: 8.4722, lng: 6.9367 },
  { id: 'fct-kwali',      name: 'Kwali',       state: 'FCT', disco: 'AEDC', lat: 8.7500, lng: 7.0000 },

  // ── Rivers State ─────────────────────────────────────────────────────────
  { id: 'rv-phc',           name: 'Port Harcourt',      state: 'Rivers',      disco: 'PHED',   lat: 4.8156, lng: 7.0498 },
  { id: 'rv-obio-akpor',    name: 'Obio-Akpor',         state: 'Rivers',      disco: 'PHED',   lat: 4.8500, lng: 6.9722 },
  { id: 'rv-eleme',         name: 'Eleme',              state: 'Rivers',      disco: 'PHED',   lat: 4.7500, lng: 7.1500 },
  { id: 'rv-ikwerre',       name: 'Ikwerre',            state: 'Rivers',      disco: 'PHED',   lat: 5.0000, lng: 6.8833 },
  { id: 'rv-emohua',        name: 'Emohua',             state: 'Rivers',      disco: 'PHED',   lat: 4.6636, lng: 6.8697 },

  // ── Oyo State ────────────────────────────────────────────────────────────
  { id: 'oyo-ibadan-n',     name: 'Ibadan North',       state: 'Oyo',         disco: 'IBEDC',  lat: 7.3986, lng: 3.9438 },
  { id: 'oyo-ibadan-sw',    name: 'Ibadan South-West',  state: 'Oyo',         disco: 'IBEDC',  lat: 7.3633, lng: 3.8767 },
  { id: 'oyo-ibadan-nw',    name: 'Ibadan North-West',  state: 'Oyo',         disco: 'IBEDC',  lat: 7.3981, lng: 3.8997 },
  { id: 'oyo-ogbomosho',    name: 'Ogbomosho North',    state: 'Oyo',         disco: 'IBEDC',  lat: 8.1333, lng: 4.2667 },
  { id: 'oyo-oyo',          name: 'Oyo East',           state: 'Oyo',         disco: 'IBEDC',  lat: 7.8533, lng: 3.9294 },

  // ── Ogun State ───────────────────────────────────────────────────────────
  { id: 'ogun-abeokuta-n',  name: 'Abeokuta North',     state: 'Ogun',        disco: 'IBEDC',  lat: 7.1556, lng: 3.3622 },
  { id: 'ogun-abeokuta-s',  name: 'Abeokuta South',     state: 'Ogun',        disco: 'IBEDC',  lat: 7.1472, lng: 3.3422 },
  { id: 'ogun-sagamu',      name: 'Sagamu',             state: 'Ogun',        disco: 'IBEDC',  lat: 6.8383, lng: 3.6475 },

  // ── Kano State ───────────────────────────────────────────────────────────
  { id: 'kano-municipal',   name: 'Kano Municipal',     state: 'Kano',        disco: 'KEDCO',  lat: 12.0000, lng: 8.5167 },
  { id: 'kano-fagge',       name: 'Fagge',              state: 'Kano',        disco: 'KEDCO',  lat: 12.0167, lng: 8.5169 },
  { id: 'kano-dala',        name: 'Dala',               state: 'Kano',        disco: 'KEDCO',  lat: 12.0000, lng: 8.5500 },
  { id: 'kano-nassarawa',   name: 'Nassarawa (Kano)',   state: 'Kano',        disco: 'KEDCO',  lat: 11.9900, lng: 8.5333 },
  { id: 'kano-gwale',       name: 'Gwale',              state: 'Kano',        disco: 'KEDCO',  lat: 11.9990, lng: 8.5040 },

  // ── Kaduna State ─────────────────────────────────────────────────────────
  { id: 'kdna-north',       name: 'Kaduna North',       state: 'Kaduna',      disco: 'KAEDCO', lat: 10.5269, lng: 7.4401 },
  { id: 'kdna-south',       name: 'Kaduna South',       state: 'Kaduna',      disco: 'KAEDCO', lat: 10.4958, lng: 7.4289 },

  // ── Edo State ────────────────────────────────────────────────────────────
  { id: 'edo-oredo',        name: 'Oredo (Benin City)', state: 'Edo',         disco: 'BeDE',   lat: 6.3333, lng: 5.6333 },
  { id: 'edo-egor',         name: 'Egor',               state: 'Edo',         disco: 'BeDE',   lat: 6.3200, lng: 5.6167 },
  { id: 'edo-ikpoba',       name: 'Ikpoba Okha',        state: 'Edo',         disco: 'BeDE',   lat: 6.3500, lng: 5.6667 },

  // ── Delta State ──────────────────────────────────────────────────────────
  { id: 'delta-asaba',      name: 'Oshimili South (Asaba)', state: 'Delta',   disco: 'BeDE',   lat: 6.1956, lng: 6.7333 },
  { id: 'delta-warri',      name: 'Warri South',        state: 'Delta',       disco: 'BeDE',   lat: 5.5219, lng: 5.7422 },
  { id: 'delta-uvwie',      name: 'Uvwie (Effurun)',     state: 'Delta',       disco: 'BeDE',   lat: 5.5475, lng: 5.7339 },

  // ── Enugu State ──────────────────────────────────────────────────────────
  { id: 'enugu-north',      name: 'Enugu North',        state: 'Enugu',       disco: 'EEDC',   lat: 6.4560, lng: 7.5100 },
  { id: 'enugu-south',      name: 'Enugu South',        state: 'Enugu',       disco: 'EEDC',   lat: 6.4175, lng: 7.4803 },
  { id: 'enugu-udi',        name: 'Udi',                state: 'Enugu',       disco: 'EEDC',   lat: 6.3100, lng: 7.3400 },

  // ── Anambra State ────────────────────────────────────────────────────────
  { id: 'anm-onitsha',      name: 'Onitsha North',      state: 'Anambra',     disco: 'EEDC',   lat: 6.1428, lng: 6.7931 },
  { id: 'anm-nnewi',        name: 'Nnewi North',        state: 'Anambra',     disco: 'EEDC',   lat: 6.0150, lng: 6.9167 },
  { id: 'anm-awka',         name: 'Awka South',         state: 'Anambra',     disco: 'EEDC',   lat: 6.2070, lng: 7.0674 },

  // ── Imo State ────────────────────────────────────────────────────────────
  { id: 'imo-owerri',       name: 'Owerri Municipal',   state: 'Imo',         disco: 'EEDC',   lat: 5.4836, lng: 7.0333 },

  // ── Cross River State ────────────────────────────────────────────────────
  { id: 'xcr-calabar',      name: 'Calabar Municipality', state: 'Cross River', disco: 'PHED', lat: 4.9833, lng: 8.3364 },

  // ── Akwa Ibom State ──────────────────────────────────────────────────────
  { id: 'aki-uyo',          name: 'Uyo',                state: 'Akwa Ibom',   disco: 'PHED',   lat: 5.0510, lng: 7.9330 },
  { id: 'aki-eket',         name: 'Eket',               state: 'Akwa Ibom',   disco: 'PHED',   lat: 4.6474, lng: 7.9260 },

  // ── Niger State ──────────────────────────────────────────────────────────
  { id: 'niger-bosso',      name: 'Bosso (Minna)',       state: 'Niger',       disco: 'AEDC',   lat: 9.6139, lng: 6.5486 },
  { id: 'niger-chanchaga',  name: 'Chanchaga',           state: 'Niger',       disco: 'AEDC',   lat: 9.6447, lng: 6.5633 },

  // ── Nasarawa State ───────────────────────────────────────────────────────
  { id: 'nas-karu',         name: 'Karu',               state: 'Nasarawa',    disco: 'AEDC',   lat: 8.7839, lng: 7.6100 },
  { id: 'nas-lafia',        name: 'Lafia',              state: 'Nasarawa',    disco: 'AEDC',   lat: 8.4893, lng: 8.5153 },

  // ── Kogi State ───────────────────────────────────────────────────────────
  { id: 'kogi-lokoja',      name: 'Lokoja',             state: 'Kogi',        disco: 'AEDC',   lat: 7.7986, lng: 6.7356 },
];

// Group by state for Settings dropdown
export const LGA_BY_STATE = NIGERIA_LGAS.reduce((acc, lga) => {
  if (!acc[lga.state]) acc[lga.state] = [];
  acc[lga.state].push(lga);
  return acc;
}, {});

export const LGA_STATES = Object.keys(LGA_BY_STATE).sort();

export function getLGAByName(name) {
  return NIGERIA_LGAS.find(l => l.name === name) ?? null;
}
