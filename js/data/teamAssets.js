/** ISO 3166 codes for flagcdn.com; local badge slugs under assets/badges/. */
export const TEAM_ISO = {
  "Mexico":"mx","South Korea":"kr","South Africa":"za","Czechia":"cz",
  "Canada":"ca","Switzerland":"ch","Qatar":"qa","Bosnia & Herzegovina":"ba",
  "Brazil":"br","Morocco":"ma","Scotland":"gb-sct","Haiti":"ht",
  "United States":"us","Australia":"au","Paraguay":"py","Turkey":"tr",
  "Germany":"de","Curaçao":"cw","Ivory Coast":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Tunisia":"tn","Sweden":"se",
  "Belgium":"be","Iran":"ir","Egypt":"eg","New Zealand":"nz",
  "Spain":"es","Uruguay":"uy","Saudi Arabia":"sa","Cape Verde":"cv",
  "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
  "Argentina":"ar","Austria":"at","Algeria":"dz","Jordan":"jo",
  "Portugal":"pt","Colombia":"co","Uzbekistan":"uz","DR Congo":"cd",
  "England":"gb-eng","Croatia":"hr","Panama":"pa","Ghana":"gh",
};

/** Team name → assets/badges/{slug}.svg filename stem */
export const TEAM_BADGE = {
  "Mexico":"mexico","South Korea":"south_korea","South Africa":"south_africa","Czechia":"czechia",
  "Canada":"canada","Switzerland":"switzerland","Qatar":"qatar","Bosnia & Herzegovina":"bosnia_and_herzegovina",
  "Brazil":"brazil","Morocco":"morocco","Scotland":"scotland","Haiti":"haiti",
  "United States":"usa","Australia":"australia","Paraguay":"paraguay","Turkey":"turkey",
  "Germany":"germany","Curaçao":"curacao","Ivory Coast":"ivory_coast","Ecuador":"ecuador",
  "Netherlands":"netherlands","Japan":"japan","Tunisia":"tunisia","Sweden":"sweden",
  "Belgium":"belgium","Iran":"iran","Egypt":"egypt","New Zealand":"new_zealand",
  "Spain":"spain","Uruguay":"uruguay","Saudi Arabia":"saudi_arabia","Cape Verde":"cape_verde",
  "France":"france","Senegal":"senegal","Iraq":"iraq","Norway":"norway",
  "Argentina":"argentina","Austria":"austria","Algeria":"algeria","Jordan":"jordan",
  "Portugal":"portugal","Colombia":"colombia","Uzbekistan":"uzbekistan","DR Congo":"dr_congo",
  "England":"england","Croatia":"croatia","Panama":"panama","Ghana":"ghana",
};

const badgeModules = import.meta.glob('../../assets/badges/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const BADGE_BY_SLUG = Object.fromEntries(
  Object.entries(badgeModules).map(([path, url]) => {
    const slug = path.split('/').pop().replace('.svg', '');
    return [slug, url];
  }),
);

export const flagUrl = team =>
  TEAM_ISO[team] ? `https://flagcdn.com/w80/${TEAM_ISO[team]}.png` : null;

export const badgeUrl = team => {
  const slug = TEAM_BADGE[team];
  return slug ? (BADGE_BY_SLUG[slug] || null) : null;
};

/** @deprecated use badgeUrl */
export const crestUrl = badgeUrl;
