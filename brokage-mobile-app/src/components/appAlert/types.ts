export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

export type AppAlertVariant = 'dialog' | 'actionSheet';

export type AppAlertInput = {
  title?: string;
  message?: string;
  buttons?: AppAlertButton[];
  variant?: AppAlertVariant;
  /** Backdrop tap / Android hardware back (default true). */
  cancelable?: boolean;
};

export type AppAlertState = {
  title?: string;
  message?: string;
  buttons: AppAlertButton[];
  variant: AppAlertVariant;
  cancelable: boolean;
};

export type AppToastInput = {
  title: string;
  message?: string;
  kind?: 'success' | 'info';
};
