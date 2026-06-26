export   { id:"street", name:"Street Gym",       base:5,  mult:1.0, cost:10,  unlockLevel:1,  desc:"Rusted weights in an alley." },
  { id:"local",  name:"Local Gym",        base:10, mult:1.5, cost:20,  unlockLevel:5,  desc:"A proper gym with real equipment." },
  { id:"pro",    name:"Professional Gym", base:20, mult:2.0, cost:50,  unlockLevel:15, desc:"Coaches and serious athletes." },
  { id:"elite",  name:"Elite Gym",        base:35, mult:3.0, cost:100, unlockLevel:30, desc:"Private trainers, top machines." },
  { id:"lab",    name:"Underground Lab",  base:50, mult:4.0, cost:200, unlockLevel:50, desc:"No rules. Maximum gains. Legends only." },
];

const TRAIN_STATS = [
  { id:"strength",  name:"Strength",  icon:"💪", desc:"Increases attack power" },
  { id:"defense",   name:"Defense",   icon:"🛡", desc:"Reduces damage taken" },
  { id:"dexterity", name:"Dexterity", icon:"⚡", desc:"Hit chance & crit rate" },
];

const DAILY_REWARDS = {
  1: { cash:500,   label:"$500" },
  2: { cash:1000,  label:"$1,000" },
  3: { cash:2000,  label:"$2,000" },
  4: { cash:1500,  label:"$1,500" },
  5: { cash:2500,  label:"$2,500" },
  6: { cash:3000,  label:"$3,000" },
  7: { cash:5000,  label:"$5,000 + Rare Item", itemId:"scanner" },
};

const MAX_LEVEL = 100;
const XP_FOR_LEVEL = (lvl) => Math.floor(80 * Math.pow(lvl, 1.3));
const MAX_ENERGY = 100, MAX_NERVE = 50, MAX_HEALTH = 100;
const SYNDICATE_COST = 100000000;
const ADMIN_USER = "admin", ADMIN_PASS = "ShadowAdmin@2024";

// ── PROPERTIES ──────────────────────────────────────────────
const PROPERTIES = [
  { id:"safehouse",  name:"Safe House",        icon:"🏠", price:50000,    incomePerHour:500,   unlockLevel:5,  desc:"A quiet bolt-hole. Trickles in rent money." },
  { id:"chopshop",   name:"Chop Shop",         icon:"🔧", price:250000,   incomePerHour:2500,  unlockLevel:15, desc:"Strip and sell stolen rides. Steady work." },
  { id:"warehouse",  name:"Warehouse",         icon:"🏭", price:1000000,  incomePerHour:8000,  unlockLevel:25, desc:"Store and move product. Real money here." },
  { id:"nightclub",  name:"Nightclub",         icon:"🎰", price:5000000,  incomePerHour:25000, unlockLevel:40, desc:"Front for the operation. Prints cash nightly." },
  { id:"casino",     name:"Underground Casino",icon:"♠", price:25000000, incomePerHour:100000,unlockLevel:60, desc:"High stakes. The house always wins — yours." },
];

// ── BLACK MARKET ─────────────────────────────────────────────
const BM_POOL = [
  { id:"bm_silencer", name:"Silencer Kit",    type:"weapon", weaponDmg:45, armorRating:0, rarity:"rare",      basePrice:12000 },
  { id:"bm_smg",      name:"Compact SMG",     type:"weapon", weaponDmg:60, armorRating:0, rarity:"legendary", basePrice:30000 },
  { id:"bm_ceramic",  name:"Ceramic Plate",   type:"armor",  weaponDmg:0,  armorRating:50,rarity:"legendary", basePrice:22000 },
  { id:"bm_chainmail",name:"Dragon-Skin Vest",type:"armor",  weaponDmg:0,  armorRating:30,rarity:"rare",      basePrice:9000  },
  { id:"bm_jammer",   name:"Signal Jammer",   type:"tool",   weaponDmg:0,  armorRating:0, rarity:"rare",      basePrice:8000,  crimeBonus:25 },
  { id:"bm_drone",    name:"Recon Drone",     type:"tool",   weaponDmg:0,  armorRating:0, rarity:"legendary", basePrice:20000, crimeBonus:35 },
  { id:"bm_stim",     name:"Combat Stims",    type:"consumable",weaponDmg:0,armorRating:0,rarity:"rare",      basePrice:5000  },
  { id:"bm_medkit",   name:"Field Medkit",    type:"consumable",weaponDmg:0,armorRating:0,rarity:"common",    basePrice:2000  },
];

// ── PRESTIGE ─────────────────────────────────────────────────
const PRESTIGE_BONUS = [
  { tier:1, label:"GHOST",    color:"#aaa",    cashMult:1.10, xpMult:1.10, crimeBonus:5  },
  { tier:2, label:"PHANTOM",  color:"#4d9fff", cashMult:1.25, xpMult:1.20, crimeBonus:10 },
  { tier:3, label:"WRAITH",   color:"#9b6dff", cashMult:1.50, xpMult:1.35, crimeBonus:18 },
  { tier:4, label:"SPECTER",  color:"#ff8c00", cashMult:1.80, xpMult:1.50, crimeBonus:25 },
  { tier:5, label:"SHADOW",   color:"#e8001e", cashMult:2.20, xpMult:2.00, crimeBonus:35 },
];
const PRESTIGE_REQ_LEVEL = 50;

// ── JAIL ─────────────────────────────────────────────────────
const BAIL_COST = (level) => Math.floor(500 * Math.pow(level, 1.3));
const JAIL_SENTENCES = {
  "pickpocket":    { time: 1 },
  "shoplifting":   { time: 2 },
  "mugging":       { time: 4 },
  "car theft":     { time: 6 },
  "armed robbery": { time: 10 },
  "bank heist":    { time: 20 },
};

// ── TRAVEL ───────────────────────────────────────────────────
