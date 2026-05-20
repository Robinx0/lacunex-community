import { describe, it, expect } from 'vitest';
import { SEVERITY_LABELS, SEVERITY_ORDER, STATUS_LABELS } from '@shared/constants';

describe('shared constants', () => {
  it('lists severities in descending impact order', () => {
    expect(SEVERITY_ORDER).toEqual(['crit', 'high', 'med', 'low', 'info']);
  });

  it('has a label for every severity', () => {
    for (const sev of SEVERITY_ORDER) {
      expect(SEVERITY_LABELS[sev]).toBeTruthy();
    }
  });

  it('has a label for every finding status', () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(
      ['fixed', 'open', 'risk_accepted', 'triaged', 'wont_fix'].sort(),
    );
  });
});
