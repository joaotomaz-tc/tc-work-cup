export const BASE_ODDS = {
  "Spain":6,"France":6,"England":7,"Argentina":9,"Portugal":10,"Brazil":13,"Germany":15,
  "Netherlands":21,"Norway":26,"Belgium":34,"Croatia":41,"Uruguay":41,"Morocco":41,"United States":41,
  "Colombia":51,"Mexico":51,"Senegal":51,"Switzerland":67,"Japan":67,"Sweden":67,
  "Ecuador":81,"Austria":81,"Turkey":81,"Canada":81,"Ivory Coast":101,"Egypt":126,
  "South Korea":151,"Australia":151,"Czechia":151,"Scotland":201,"Algeria":201,"Ghana":201,
  "Qatar":251,"Tunisia":251,"Iran":251,"Paraguay":251,"Bosnia & Herzegovina":251,"DR Congo":251,
  "Saudi Arabia":501,"Uzbekistan":501,"South Africa":501,"Jordan":751,"Iraq":751,"Panama":751,
  "Cape Verde":751,"New Zealand":1001,"Haiti":1001,"Curaçao":1001,
};

export const strength = t => 1 / (BASE_ODDS[t] ?? 1500);
