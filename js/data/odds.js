export const BASE_ODDS = {
  "France": 5,
  "Spain": 5.5,
  "Argentina": 6,
  "England": 7,
  "Portugal": 8.5,
  "Brazil": 12,
  "Netherlands": 12,

  "Germany": 15,
  "Morocco": 28,
  "United States": 33,
  "Norway": 33,
  "Belgium": 40,
  "Colombia": 40,
  "Mexico": 40,
  "Japan": 40,

  "Croatia": 80,
  "Switzerland": 80,
  "Uruguay": 66,
  "Canada": 100,
  "Austria": 125,
  "Ivory Coast": 100,
  "Senegal": 125,

  "Australia": 150,
  "Sweden": 200,
  "Scotland": 250,
  "Ecuador": 250,
  "Egypt": 250,
  "Paraguay": 250,

  "South Korea": 300,
  "Ghana": 400,
  "Czechia": 500,
  "Bosnia & Herzegovina": 500,

  "Algeria": 500,
  "Iran": 750,
  "Tunisia": 750,
  "DR Congo": 750,

  "Saudi Arabia": 1000,
  "Cape Verde": 1000,
  "New Zealand": 1000,
  "South Africa": 2000,

  "Uzbekistan": 1500,
  "Panama": 1500,
  "Haiti": 2000,
  "Iraq": 2000,
  "Jordan": 2500,
  "Curaçao": 2500,
  "Qatar": 3500,
};

export const strength = t => 1 / (BASE_ODDS[t] ?? 1500);
