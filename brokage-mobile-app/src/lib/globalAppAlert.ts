import type { AppAlertInput } from '../components/appAlert/types';

type ShowFn = (input: AppAlertInput) => void;

let showImpl: ShowFn | null = null;

export function registerAppAlertShow(fn: ShowFn | null) {
  showImpl = fn;
}

/** For use outside React (e.g. image picker helpers). Safe after `AppAlertProvider` mounts. */
export function showAppAlert(input: AppAlertInput) {
  showImpl?.(input);
}
