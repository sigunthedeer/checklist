import { Platform, Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

/** Copies text to the clipboard. Web only: the native build has no clipboard module. */
export async function copyText(text: string): Promise<ShareResult> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return 'unavailable';
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}

/** Opens the system share sheet with some text: the OS one on native, the Web Share API in a browser. */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (Platform.OS !== 'web') {
    const result = await Share.share({ title, message: text });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  }
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unavailable';
  try {
    await navigator.share({ title, text });
    return 'shared';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'unavailable';
  }
}

export const canCopy = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
export const canShare = () => Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
