import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ChatMessage } from '../../types/models';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { colors } from '../../theme/colors';
import { PostPhotoBranding } from '../post/PostPhotoOverlay';

type Props = {
  post: NonNullable<ChatMessage['communityPostContext']>;
  onPress: () => void;
};

export function ChatCommunityPostAttachment({
  post,
  onPress,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const image = post.images?.[0];
  const isDisplay = post.kind === 'display';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}>
      {image ? (
        <View style={styles.image}>
          <Image
            source={{ uri: image }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <PostPhotoBranding brokerName={post.authorName} compact />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.label}>{isDisplay ? 'DISPLAY' : 'ADD'}</Text>

        <Text
          style={styles.title}
          numberOfLines={2}>
          {post.title}
        </Text>

        <Text
          style={styles.city}
          numberOfLines={1}>
          {isDisplay ? `${post.marlaSize} Marla` : post.city}
        </Text>

        <Text style={styles.tap}>
          {isDisplay ? "Tap to view broker's Display" : 'Tap to view details'}
        </Text>
      </View>
    </Pressable>
  );
}

const buildStyles = () => StyleSheet.create({
  card: {
    width: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: 4,
  },

  pressed: {
    opacity: 0.85,
  },

  image: {
    width: '100%',
    height: 160,
  },

  content: {
    padding: 12,
  },

  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentBrown,
    marginBottom: 4,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  city: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },

  tap: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
});