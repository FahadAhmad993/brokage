import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Declarative deep-link map for production routing consistency.
 * Native URL scheme registration can be added later without changing route config.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['brokage://', 'https://app.brokage.local'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          // ChatThread + profile sub-screens are siblings of `Tabs` in
          // MainStackNavigator — pushing them above the tab nav hides
          // the native bottom tab bar so it can't fight the keyboard.
          ChatThread: 'chats/thread/:threadId',
          EditProfile: 'profile/edit',
          ChangePassword: 'profile/password',
          Settings: 'profile/settings',
          Tabs: {
            screens: {
              HomeTab: {
                screens: {
                  Home: 'home',
                  PropertyDetail: 'property/:propertyId',
                  AddProperty: 'property/new',
                  MyListings: 'listings/my',
                  SavedProperties: 'listings/saved',
                },
              },
              ChatsTab: {
                screens: {
                  ChatList: 'chats',
                },
              },
              GroupChatsTab: {
                screens: {
                  ChatList: 'group-chats',
                },
              },
              ProfileTab: {
                screens: {
                  ProfileHome: 'profile',
                },
              },
            },
          },
        },
      },
    },
  },
};

