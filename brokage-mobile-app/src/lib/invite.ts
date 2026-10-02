/**
 * "Invite a friend" — opens the system share sheet (WhatsApp, SMS, Telegram,
 * email … whatever the person has) with a ready-made message + app link.
 */
import { Platform, Share } from 'react-native';
import { APP_NAME } from '../config/appConfig';

/** Android package id (see android/app/build.gradle `applicationId`). */
export const ANDROID_PACKAGE_ID = 'com.brokerchat.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

export function buildInviteMessage(inviterName?: string | null): string {
  const who = inviterName?.trim() ? `${inviterName.trim()} has invited you to` : 'Join me on';
  return (
    `${who} ${APP_NAME} — chat with property brokers, share listings and ads.\n\n` +
    `Download the app: ${PLAY_STORE_URL}`
  );
}

/** Returns true if the person actually shared (false if they dismissed the sheet). */
export async function shareInvite(inviterName?: string | null): Promise<boolean> {
  const message = buildInviteMessage(inviterName);
  const result = await Share.share(
    Platform.OS === 'ios'
      ? { message, url: PLAY_STORE_URL }
      : { message, title: `Join ${APP_NAME}` },
    { dialogTitle: `Invite to ${APP_NAME}` },
  );
  return result.action === Share.sharedAction;
}
