function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = (window as any).pifwcAdmin?.i18nDict;
  let result = key;

  if (dict && typeof dict === 'object' && key in dict) {
    const val = (dict as any)[key];
    if (typeof val === 'string' && val.length > 0) {
      result = val;
    }
  }

  if (vars && typeof vars === 'object') {
    for (const [name, value] of Object.entries(vars)) {
      const rx = new RegExp(`\\{${escapeRegExp(name)}\\}`, 'g');
      result = result.replace(rx, String(value));
    }
  }

  return result;
}
