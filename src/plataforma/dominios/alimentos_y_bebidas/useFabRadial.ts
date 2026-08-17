import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

export type FabItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  enabled?: boolean;
  action?: string;
};

export function useFabRadial(itemsInput: FabItem[], initialActiveKey: string, visibleCount = 4) {
  const items = useMemo(() => itemsInput.filter((i) => i.enabled !== false), [itemsInput]);
  const firstKey = items[0]?.key;
  const safeInitialKey = useMemo(() => {
    if (!items.length) return undefined;
    return items.find((i) => i.key === initialActiveKey)?.key ?? firstKey;
  }, [items, initialActiveKey, firstKey]);

  const [expanded, setExpanded] = useState(false);
  const [activeKey, setActiveKey] = useState(safeInitialKey);
  const [offset, setOffset] = useState(0);

  const len = items.length;
  const visible = useMemo(() => {
    if (len === 0) return [] as FabItem[];
    const out: FabItem[] = [];
    for (let i = 0; i < Math.min(visibleCount, len); i++) {
      const idx = (offset + i) % len;
      out.push(items[idx]);
    }
    return out;
  }, [items, offset, len, visibleCount]);

  function toggle() {
    setExpanded((v) => !v);
  }

  function expand() {
    setExpanded(true);
  }

  function collapse() {
    setExpanded(false);
  }

  function rotateUp() {
    if (len === 0) return;
    setOffset((o) => (o + 1) % len);
  }

  function rotateDown() {
    if (len === 0) return;
    setOffset((o) => (o - 1 + len) % len);
  }

  function selectByKey(k: string) {
    const found = items.find((i) => i.key === k);
    if (!found) return;
    setActiveKey(k);
    setExpanded(false);
    found.onPress();
  }

  function selectItem(it: FabItem) {
    setActiveKey(it.key);
    setExpanded(false);
    it.onPress();
  }

  const activeItem = items.find((i) => i.key === activeKey) || items[0];

  return {
    expanded,
    activeKey,
    activeItem,
    visible,
    toggle,
    expand,
    collapse,
    rotateUp,
    rotateDown,
    selectByKey,
    selectItem,
  } as const;
}
