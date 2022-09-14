import { logic, LogicResult } from "./logic";
import GI from '../data/gi.json';
import { Game, GAMES } from "./config";

const OFFSETS = {
  oot: 0x1000,
  mm: 0x2000,
};

const SUBSTITUTIONS: {[k: string]: string} = {
  OOT_SWORD: "OOT_SWORD_KOKIRI",
  OOT_OCARINA: "OOT_OCARINA_FAIRY",
  OOT_STRENGTH: "OOT_GORON_BRACELET",
  OOT_SCALE: "OOT_SCALE_SILVER",
  OOT_SHIELD: "OOT_SHIELD_DEKU",
  MM_SWORD: "MM_SWORD_KOKIRI",
  MM_SHIELD: "MM_SHIELD_HYLIAN",
  MM_OCARINA: "MM_OCARINA_OF_TIME",
};

const gi = (game: Game, item: string) => {
  /* Dungeon Items */
  /* TODO: Refactor this horror */
  if (/^OOT_MAP/.test(item)) {
    item = "OOT_MAP";
  } else if (/^OOT_COMPASS/.test(item)) {
    item = "OOT_COMPASS";
  } else if (/^OOT_SMALL_KEY/.test(item)) {
    item = "OOT_SMALL_KEY";
  } else if (/^OOT_BOSS_KEY/.test(item)) {
    item = "OOT_BOSS_KEY";
  } else if (/^MM_MAP/.test(item)) {
    item = "MM_MAP";
  } else if (/^MM_COMPASS/.test(item)) {
    item = "MM_COMPASS";
  } else if (/^MM_SMALL_KEY/.test(item)) {
    item = "MM_SMALL_KEY";
  } else if (/^MM_BOSS_KEY/.test(item)) {
    item = "MM_BOSS_KEY";
  } else if (/^MM_STRAY_FAIRY/.test(item)) {
    item = "MM_STRAY_FAIRY";
  }

  const subst = SUBSTITUTIONS[item];
  if (subst) {
    item = subst;
  }

  let value = parseInt((GI as any)[item], 16);
  if (value === undefined) {
    throw new Error(`Unknown item ${item}`);
  }

  if ((/^OOT_/.test(item) && game === 'mm') || (/^MM_/.test(item) && game === 'oot')) {
    value |= 0x100;
  }

  return value;
}

const toU16Buffer = (data: number[]) => {
  const buf = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; ++i) {
    buf.writeUInt16BE(data[i], i * 2);
  }
  return buf;
};

export const randomizeGame = (game: Game, logic: LogicResult): Buffer => {
  const buf: number[] = [];
  for (const c of logic.items) {
    if (c.game !== game) {
      continue;
    }
    let { id, sceneId } = c;
    switch (c.type) {
    case 'special':
      sceneId = 0xf0;
      break;
    case 'npc':
      sceneId = 0xf1;
      break;
    case 'collectible':
      id |= 0x40;
      break;
    }
    const key = (sceneId << 8) | id;
    const item = gi(game, c.item);
    buf.push(key, item);
  }
  return toU16Buffer(buf);
};

export const randomize = async (rom: Buffer) => {
  console.log("Randomizing...");
  const res = await logic();
  const buffer = Buffer.alloc(0x20000, 0xff);
  for (const g of GAMES) {
    const gameBuffer = randomizeGame(g, res);
    gameBuffer.copy(buffer, OFFSETS[g]);
  }
  buffer.copy(rom, 0x03fe0000);
  return res.log;
}
