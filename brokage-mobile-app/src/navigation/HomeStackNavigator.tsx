import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
// import { MapExploreScreen } from '../screens/home/MapExploreScreen'; // Paid scope — map explore
import { SavedPropertiesScreen } from '../screens/home/SavedPropertiesScreen';
import { MyListingsScreen } from '../screens/listings/MyListingsScreen';
import { AddPropertyScreen } from '../screens/property/AddPropertyScreen';
import { PropertyDetailScreen } from '../screens/property/PropertyDetailScreen';
import { colors } from '../theme/colors';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { iconSize, iconStroke } from '../theme/icons';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

function MyListingsHeaderAdd() {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const headerAddStyles = useThemedStyles(buildHeaderAddStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add listing"
      hitSlop={12}
      onPress={() => navigation.navigate('AddProperty')}
      style={headerAddStyles.wrap}>
      <Plus
        color={colors.primary}
        size={iconSize.lg}
        strokeWidth={iconStroke}
      />
    </Pressable>
  );
}

const buildHeaderAddStyles = () =>
  StyleSheet.create({
  wrap: { paddingRight: 4 },
});

function renderMyListingsHeaderRight() {
  return <MyListingsHeaderAdd />;
}

export function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.topBar },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        freezeOnBlur: true,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{
          title: 'Listing',
          headerBackTitle: 'Home',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      {/*
      <Stack.Screen
        name="MapExplore"
        component={MapExploreScreen}
        options={{ title: 'Explore map' }}
      />
      */}
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{
          title: 'Your listings',
          headerRight: renderMyListingsHeaderRight,
        }}
      />
      <Stack.Screen
        name="SavedProperties"
        component={SavedPropertiesScreen}
        options={{ title: 'Saved' }}
      />
    </Stack.Navigator>
  );
}
