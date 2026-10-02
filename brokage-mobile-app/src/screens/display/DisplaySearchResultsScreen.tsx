import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { errorMessage, searchDisplayBrokers } from '../../api/client';
import type { MainStackParamList } from '../../navigation/types';
import type { DisplayBrokerCard } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PostPhotoBranding } from '../../components/post/PostPhotoOverlay';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { initialsFromDisplay } from '../../utils/userDisplay';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'DisplaySearchResults'>;

/**
 * Community search → broker cards. Two cards per row on a phone-width
 * screen, each: photo, name, a short detail line, tap → their Display —
 * exactly the grid the product notes describe.
 */
export function DisplaySearchResultsScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const query = route.params.query;

  const resultsQuery = useQuery({
    queryKey: ['display', 'search', query],
    queryFn: () => searchDisplayBrokers(query),
  });

  const results = resultsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ArrowLeft color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          "{query}"
        </Text>
        <View style={{ width: iconSize.md }} />
      </View>

      {resultsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : null}
      {resultsQuery.isError ? (
        <Text style={styles.errorText}>
          {errorMessage(resultsQuery.error, 'Could not search right now.')}
        </Text>
      ) : null}
      {resultsQuery.data && results.length === 0 ? (
        <Text style={styles.emptyText}>No brokers match "{query}" yet.</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={item => item.userId}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <BrokerCard item={item} navigation={navigation} />}
      />
    </SafeAreaView>
  );
}

function BrokerCard({
  item,
  navigation,
}: {
  item: DisplayBrokerCard;
  navigation: Nav;
}) {
  const styles = useThemedStyles(buildStyles);
  const thumb = item.matchingPost.images[0];
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        navigation.navigate('UserDisplay', { userId: item.userId, displayName: item.displayName })
      }>
      <View style={styles.cardImageWrap}>
        {thumb ? (
          <>
            <Image source={{ uri: thumb }} style={styles.cardImage} resizeMode="cover" />
            <PostPhotoBranding brokerName={item.displayName} compact />
          </>
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Text style={styles.cardImageFallbackText}>
              {initialsFromDisplay(item.displayName, undefined)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {item.displayName}
      </Text>
      <Text style={styles.cardDetail} numberOfLines={1}>
        {item.matchingPost.marlaSize} Marla{item.estateName ? ` · ${item.estateName}` : ''}
      </Text>
      {item.totalMatches > 1 ? (
        <Text style={styles.cardMore}>+{item.totalMatches - 1} more</Text>
      ) : null}
    </Pressable>
  );
}

const buildStyles = () =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.topBar,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.topBarBorder,
    },
    headerTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    emptyText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: layout.screenPaddingHorizontal,
    },
    listContent: {
      padding: layout.screenPaddingHorizontal,
      gap: spacing.md,
    },
    row: { gap: spacing.md },
    card: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: layout.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: spacing.sm,
    },
    cardImageWrap: { width: '100%', aspectRatio: 1 },
    cardImage: { width: '100%', height: '100%' },
    cardImageFallback: {
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardImageFallbackText: { ...typography.displayMedium, color: colors.primary },
    cardName: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    cardDetail: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.sm,
    },
    cardMore: {
      ...typography.caption,
      color: colors.accentBrown,
      paddingHorizontal: spacing.sm,
      marginTop: 2,
    },
  });
