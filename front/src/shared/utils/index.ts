export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let _idCounter = 0;

export function generateId(): string {
  _idCounter += 1;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}