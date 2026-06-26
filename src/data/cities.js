export const CITIES = [
  {
    id:"hometown", name:"Maplewood", flag:"🏙", unlockLevel:1, travelCost:0, travelHours:0,
    desc:"Your turf. Familiar streets, familiar risks.",
    crimeBonus:0, cashMult:1.0, xpMult:1.0,
    crimes:["pickpocket","shoplifting","mugging","carjacking","robbery","heist"],
    lootTable:["knife","pipe","lockpick","vest"],
    flavor:"The city you grew up in. Every alley tells a story.",
  },
  {
    id:"portclay", name:"Port Clay", flag:"⚓", unlockLevel:5, travelCost:5000, travelHours:1,
    desc:"A port city thick with smugglers and bent cops.",
    crimeBonus:5, cashMult:1.15, xpMult:1.1,
    crimes:["shoplifting","mugging","carjacking","robbery","heist"],
    lootTable:["pipe","pistol","lockpick","scanner","vest"],
    flavor:"Salt air and dirty money. The docks never sleep.",
  },
  {
    id:"neonridge", name:"Neon Ridge", flag:"🌆", unlockLevel:15, travelCost:25000, travelHours:3,
    desc:"Vice city. Casinos, clubs, and corporate crime.",
    crimeBonus:10, cashMult:1.35, xpMult:1.2,
    crimes:["mugging","carjacking","robbery","heist"],
    lootTable:["pistol","shotgun","jacket","scanner","bm_jammer"],
    flavor:"Everything's for sale here. Even the law.",
  },
  {
    id:"irongate", name:"Iron Gate", flag:"🏭", unlockLevel:25, travelCost:100000, travelHours:6,
    desc:"Industrial wasteland run by rival syndicates.",
    crimeBonus:15, cashMult:1.6, xpMult:1.35,
    crimes:["carjacking","robbery","heist"],
    lootTable:["shotgun","uzi","jacket","plate","bm_chainmail","bm_jammer"],
    flavor:"Smoke stacks and gunfire. Survival is the only rule.",
  },
  {
    id:"ghosthaven", name:"Ghost Haven", flag:"💀", unlockLevel:40, travelCost:500000, travelHours:12,
    desc:"The underworld capital. No rules. No mercy.",
    crimeBonus:25, cashMult:2.0, xpMult:1.6,
    crimes:["robbery","heist"],
    lootTable:["uzi","plate","bm_silencer","bm_smg","bm_ceramic","bm_drone"],
    flavor:"You came here to make a name — or lose one forever.",
  },
];

const TRAVEL_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between trips

function calcTravelArrival(hours) { return Date.now() + hours * 3600000; }

export function calcTravelArrival(hours) { return Date.now() + hours * 3600000; }
