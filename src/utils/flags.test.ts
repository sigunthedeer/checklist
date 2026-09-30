import type { Flag } from '../state/flags';
import { flagPlace, flagReport, flagRoute } from './flags';

const flag = (patch: Partial<Flag>): Flag => ({
  key: 'k',
  kind: 'item',
  scope: 'airbus-a320neo',
  section: 'fms-setup',
  index: 5,
  text: 'INIT B: ZFW, ZFWCG, BLOCK FUEL ENTERED',
  note: '',
  at: 0,
  ...patch,
});

describe('flag report', () => {
  it('names the aircraft and checklist, counting items from 1', () => {
    expect(flagPlace(flag({}))).toEqual({ title: 'Airbus A320neo · MCDU / FMGC Setup', position: 'item 6' });
  });

  it('names guide and trainer steps by unit and procedure', () => {
    const guide = flag({ kind: 'guide', scope: 'boeing-cdu', section: 'takeoff', index: 0 });
    expect(flagPlace(guide)).toEqual({ title: 'Boeing FMC and CDU guide · Thrust and takeoff speeds', position: 'step 1' });
    const trainer = flag({ kind: 'trainer', scope: 'garmin-g1000', section: 'departure', index: 2 });
    expect(flagPlace(trainer).title).toBe('G1000 trainer · Load a departure');
  });

  it('still reads for something that no longer exists, using the raw ids', () => {
    expect(flagPlace(flag({ scope: 'gone', section: 'also-gone' })).title).toBe('gone · also-gone');
  });

  it('writes each flag with its text, note and exact location', () => {
    const report = flagReport(
      [flag({ note: 'sim calls it FUEL & LOAD' }), flag({ kind: 'guide', scope: 'airbus-mcdu', section: 'fuel', index: 1, text: 'Enter ZFW' })],
      new Date('2026-09-30T12:00:00Z'),
    );
    expect(report).toBe(
      [
        'Checkride flags: 2, 2026-09-30',
        'Airbus A320neo · MCDU / FMGC Setup · item 6\nINIT B: ZFW, ZFWCG, BLOCK FUEL ENTERED\nNote: sim calls it FUEL & LOAD\n[item airbus-a320neo/fms-setup/5]',
        'Airbus A320 MCDU guide · Weights and fuel · step 2\nEnter ZFW\nNote: (none)\n[guide airbus-mcdu/fuel/1]',
      ].join('\n\n'),
    );
  });

  it('says so when there is nothing to report', () => {
    expect(flagReport([], new Date('2026-09-30T00:00:00Z'))).toBe('Checkride flags: 0, 2026-09-30\n\nNo flags.');
  });

  it('opens the right screen for each kind', () => {
    expect(flagRoute(flag({}))).toBe('/aircraft/airbus-a320neo/fms-setup');
    expect(flagRoute(flag({ kind: 'guide', scope: 'airbus-mcdu', section: 'fuel' }))).toBe('/fms/airbus-mcdu/fuel');
    expect(flagRoute(flag({ kind: 'trainer', scope: 'airbus-mcdu', section: 'fuel' }))).toBe('/trainer/airbus-mcdu/fuel');
  });
});
