import { beforeEach, describe, expect, it } from 'vitest';

import { todayAsIsoDate, useAgendaUiStore } from './agenda-ui-store';

describe('useAgendaUiStore', () => {
  beforeEach(() => {
    useAgendaUiStore.setState({ selectedDate: todayAsIsoDate() });
  });

  it('starts with today as the selected date', () => {
    expect(useAgendaUiStore.getState().selectedDate).toBe(todayAsIsoDate());
  });

  it('updates the selected date', () => {
    useAgendaUiStore.getState().setSelectedDate('2026-08-26');

    expect(useAgendaUiStore.getState().selectedDate).toBe('2026-08-26');
  });
});
