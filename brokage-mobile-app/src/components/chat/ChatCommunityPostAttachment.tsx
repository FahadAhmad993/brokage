import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ChatMessage } from '../../types/models';

type Props = {
  post: NonNullable<ChatMessage['communityPostContext']>;
  onPress: () => void;
};

export function ChatCommunityPostAttachment({
  post,
  onPress,
}: Props) {
  const image = post.images?.[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.content}>
        <Text style={styles.label}>ADD</Text>

        <Text
          style={styles.title}
          numberOfLines={2}>
          {post.title}
        </Text>

        <Text
          style={styles.city}
          numberOfLines={1}>
          {post.city}
        </Text>

        <Text style={styles.tap}>
          Tap to view details
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
    marginBottom: 4,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
  },

  city: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },

  tap: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.65,
  },
});