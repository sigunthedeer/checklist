import { AIRCRAFT, AVIONICS, aircraftUsing, getAvionics, getProcedure, isKnownKey } from './index';

const mcdu = getAvionics('airbus-mcdu')!;
const g1000 = getAvionics('garmin-g1000')!;

describe('isKnownKey', () => {
  it('accepts line select keys only on units that have them', () => {
    expect(isKnownKey(mcdu, 'LSK 1L')).toBe(true);
    expect(isKnownKey(mcdu, 'LSK 6R')).toBe(true);
    expect(isKnownKey(g1000, 'LSK 1L')).toBe(false);
  });

  it('rejects line select keys that do not exist', () => {
    expect(isKnownKey(mcdu, 'LSK 7L')).toBe(false);
    expect(isKnownKey(mcdu, 'LSK 0R')).toBe(false);
    expect(isKnownKey(mcdu, 'LSK 1')).toBe(false);
    expect(isKnownKey(mcdu, 'lsk 1l')).toBe(false);
  });

  it('checks named keys against the unit, not the whole fleet', () => {
    expect(isKnownKey(mcdu, 'INIT')).toBe(true);
    expect(isKnownKey(mcdu, 'EXEC')).toBe(false);
    expect(isKnownKey(g1000, 'D→')).toBe(true);
  });
});

describe('guide lookups', () => {
  it('lists the aircraft fitted with a unit, in fleet order', () => {
    const fleet = aircraftUsing('garmin-g1000');
    expect(fleet.map((a) => a.id)).toContain('cessna-172-g1000');
    expect(fleet.every((a) => a.avionics === 'garmin-g1000')).toBe(true);
    const order = fleet.map((a) => AIRCRAFT.indexOf(a));
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });

  it('returns nothing for unknown ids rather than throwing', () => {
    expect(getAvionics('nope')).toBeUndefined();
    expect(getAvionics(undefined)).toBeUndefined();
    expect(getProcedure(mcdu, 'nope')).toBeUndefined();
    expect(getProcedure(mcdu, undefined)).toBeUndefined();
  });

  it('resolves every checklist link to a real procedure', () => {
    const broken: string[] = [];
    for (const aircraft of AIRCRAFT) {
      const unit = getAvionics(aircraft.avionics);
      for (const phase of [...aircraft.phases, ...(aircraft.emergency ?? [])]) {
        for (const item of phase.items) {
          if (item.guide && !(unit && getProcedure(unit, item.guide))) {
            broken.push(`${aircraft.id}/${phase.id}: ${item.c} -> ${item.guide}`);
          }
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('only uses keys each unit actually has', () => {
    const unknown = AVIONICS.flatMap((unit) =>
      unit.procedures.flatMap((procedure) =>
        procedure.steps.flatMap((step) =>
          (step.keys ?? [])
            .filter((key) => !isKnownKey(unit, key))
            .map((key) => `${unit.id}/${procedure.id}: ${key}`),
        ),
      ),
    );
    expect(unknown).toEqual([]);
  });
});
