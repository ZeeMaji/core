import { Settings, Trick, TRICKS } from "../settings";
import { Items } from "./items";
import { Age } from "./pathfind";

type State = {
  items: Items;
  age: Age;
  events: Set<string>;
  ignoreItems: boolean;
  memo: Set<number>;
};

const MASKS = [
  'MM_MASK_CAPTAIN',
  'MM_MASK_GIANT',
  'MM_MASK_ALL_NIGHT',
  'MM_MASK_BUNNY',
  'MM_MASK_KEATON',
  'MM_MASK_GARO',
  'MM_MASK_ROMANI',
  'MM_MASK_TROUPE_LEADER',
  'MM_MASK_POSTMAN',
  'MM_MASK_COUPLE',
  'MM_MASK_GREAT_FAIRY',
  'MM_MASK_GIBDO',
  'MM_MASK_DON_GERO',
  'MM_MASK_KAMARO',
  'MM_MASK_TRUTH',
  'MM_MASK_STONE',
  'MM_MASK_BREMEN',
  'MM_MASK_BLAST',
  'MM_MASK_SCENTS',
  'MM_MASK_KAFEI',
];

const itemCount = (state: State, item: string): number => state.items[item] || 0;
const itemsCount = (state: State, items: string[]): number => items.reduce((acc, item) => acc + itemCount(state, item), 0);

export type Expr = (state: State) => boolean;

export class ExprBuilder {
  private funcs: Expr[] = [];
  private tags: {[k: string]: number} = {};

  constructor() {
    this.funcs.push(_state => false);
    this.funcs.push(_state => true);
  }

  private memo(expr: Expr) {
    const id = this.funcs.length;
    const newFunc = (state: State) => {
      if (state.memo.has(id)) {
        return true;
      } else {
        const result = expr(state);
        if (result) {
          state.memo.add(id);
        }
        return result;
      }
    }
    this.funcs.push(newFunc);
    return id;
  }

  private tagMemo(tag: string, expr: Expr) {
    if (this.tags[tag] !== undefined) {
      return this.tags[tag];
    }
    const id = this.memo(expr);
    this.tags[tag] = id;
    return id;
  }

  internFalse() {
    return 0;
  }

  internTrue() {
    return 1;
  }

  internAnd(ids: number[]) {
    const sorted = [...ids].sort();
    const tag = `and:${sorted.join(',')}`;
    const exprs = sorted.map(id => this.funcs[id]);
    return this.tagMemo(tag, state => exprs.every(expr => expr(state)));
  }

  internOr(ids: number[]) {
    const sorted = [...ids].sort();
    const tag = `or:${sorted.join(',')}`;
    const exprs = sorted.map(id => this.funcs[id]);
    return this.tagMemo(tag, state => exprs.some(expr => expr(state)));
  }

  internNot(id: number) {
    const expr = this.funcs[id];
    return this.tagMemo(`not:${id}`, state => !expr(state));
  }

  internCond(id: number, trueId: number, falseId: number) {
    const expr = this.funcs[id];
    const trueExpr = this.funcs[trueId];
    const falseExpr = this.funcs[falseId];
    return this.tagMemo(`cond:${id}:${trueId}:${falseId}`, state => expr(state) ? trueExpr(state) : falseExpr(state));
  }

  internAge(age: Age) {
    /* We memozie this as well - so it's important that we use separate memo sets for each age */
    return this.tagMemo(`age:${age}`, state => state.age === age);
  }

  internHas(item: string, count: number) {
    return this.tagMemo(`has:${item}:${count}`, state => itemCount(state, item) >= count);
  }

  internEvent(event: string) {
    return this.tagMemo(`event:${event}`, state => state.events.has(event));
  }

  internMasks(count: number) {
    return this.tagMemo(`masks:${count}`, state => itemsCount(state, MASKS) >= count);
  }

  internSetting(settings: Settings, setting: string, value: any) {
    const v = (settings as any)[setting];
    if (v === undefined) {
      throw new Error(`Setting ${setting} not found`);
    }
    return v === value ? this.internTrue() : this.internFalse();
  }

  internTrick(settings: Settings, trick: string) {
    if (!TRICKS.hasOwnProperty(trick)) {
      throw new Error(`Trick ${trick} not found`);
    }
    return settings.tricks[trick as Trick] ? this.internTrue() : this.internFalse();
  }

  func(id: number) {
    return this.funcs[id];
  }
}
