import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent, Platform } from 'react-native';

/**
 * Height to reserve above the bottom edge so sticky UI (e.g. form actions)
 * stays visible above the software keyboard on iOS and Android.
 */
export function useKeyboardBottomInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      // Smooth composer motion to match keyboard transition timing.
      Keyboard.scheduleLayoutAnimation?.(e);
      setHeight(e.endCoordinates.height);
    };
    const onHide = (e: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation?.(e);
      setHeight(0);
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return height;
}
