import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('store', () => {
  beforeEach(() => useStore.setState({ hovered: null, selected: null, hasInteracted: false }));

  it('sets hovered and selected', () => {
    useStore.getState().setHovered('a');
    useStore.getState().setSelected('b');
    expect(useStore.getState()).toMatchObject({ hovered: 'a', selected: 'b' });
  });

  it('selecting marks the session as interacted', () => {
    useStore.getState().setSelected('a');
    expect(useStore.getState().hasInteracted).toBe(true);
  });

});
