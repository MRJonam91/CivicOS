// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import test from 'node:test';
import assert from 'node:assert/strict';
import { CivicCalendar } from '../src/core/calendar.ts';
import { LifecycleManager } from '../src/core/lifecycle.ts';

test('CivicCalendar correctly identifies Italian fixed and mobile holidays', () => {
  // Fixed holiday: Ferragosto (15 August)
  const ferragosto = new Date(Date.UTC(2026, 7, 15));
  assert.equal(CivicCalendar.isHoliday(ferragosto), true);
  assert.equal(CivicCalendar.isBusinessDay(ferragosto), false);

  // Fixed holiday: Capodanno (1 January)
  const capodanno = new Date(Date.UTC(2026, 0, 1));
  assert.equal(CivicCalendar.isHoliday(capodanno), true);

  // Easter Monday 2026: Easter is 5 April 2026, Easter Monday is 6 April 2026
  const easterMonday2026 = new Date(Date.UTC(2026, 3, 6));
  assert.equal(CivicCalendar.isHoliday(easterMonday2026), true);

  // Normal business day: Wednesday 4 November 2026
  const normalDay = new Date(Date.UTC(2026, 10, 4));
  assert.equal(CivicCalendar.isHoliday(normalDay), false);
  assert.equal(CivicCalendar.isBusinessDay(normalDay), true);
});

test('CivicCalendar accurately adds business days skipping weekends and holidays', () => {
  // Friday 6 November 2026 + 1 business day -> Monday 9 November 2026
  const friday = new Date(Date.UTC(2026, 10, 6));
  const nextBusinessDay = CivicCalendar.addBusinessDays(friday, 1);
  assert.equal(nextBusinessDay.toISOString().split('T')[0], '2026-11-09');

  // Friday 6 November 2026 + 5 business days -> Friday 13 November 2026
  const plus5Days = CivicCalendar.addBusinessDays(friday, 5);
  assert.equal(plus5Days.toISOString().split('T')[0], '2026-11-13');
});

test('LifecycleManager calculates business day SLA deadlines', () => {
  const start = new Date(Date.UTC(2026, 10, 6)); // Friday
  const dueCalendar = LifecycleManager.calculateDueDate(start, 5, 'calendar');
  const dueBusiness = LifecycleManager.calculateDueDate(start, 5, 'business');

  assert.equal(dueCalendar, '2026-11-11'); // Calendar adds 5 days
  assert.equal(dueBusiness, '2026-11-13'); // Business adds 5 working days (skips weekend)
});
