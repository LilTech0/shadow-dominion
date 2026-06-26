export const ITEMS = [
  { id: "knife",    name: "Switchblade",   type: "weapon", weaponDmg: 8,  armorRating: 0,  price: 500,   rarity: "common" },
  { id: "pipe",     name: "Lead Pipe",     type: "weapon", weaponDmg: 14, armorRating: 0,  price: 1200,  rarity: "common" },
  { id: "pistol",   name: "9mm Pistol",    type: "weapon", weaponDmg: 25, armorRating: 0,  price: 4000,  rarity: "rare" },
  { id: "shotgun",  name: "Sawn-Off",      type: "weapon", weaponDmg: 38, armorRating: 0,  price: 8000,  rarity: "rare" },
  { id: "uzi",      name: "Micro Uzi",     type: "weapon", weaponDmg: 52, armorRating: 0,  price: 18000, rarity: "legendary" },
  { id: "vest",     name: "Stab Vest",     type: "armor",  weaponDmg: 0,  armorRating: 10, price: 800,   rarity: "common" },
  { id: "jacket",   name: "Kevlar Jacket", type: "armor",  weaponDmg: 0,  armorRating: 22, price: 5000,  rarity: "rare" },
  { id: "plate",    name: "Tactical Plate",type: "armor",  weaponDmg: 0,  armorRating: 38, price: 15000, rarity: "legendary" },
  { id: "lockpick", name: "Lockpick Set",  type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 600,   crimeBonus: 10, rarity: "common" },
  { id: "scanner",  name: "Police Scanner",type: "tool",   weaponDmg: 0,  armorRating: 0,  price: 1500,  crimeBonus: 18, rarity: "rare" },
];

const GYMS = [

export const BM_POOL = ITEMS.filter(i=>i.blackMarket);
