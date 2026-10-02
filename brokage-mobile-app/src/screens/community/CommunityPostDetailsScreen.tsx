import React, { useState } from 'react';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { PostPhotoOverlay } from '../../components/post/PostPhotoOverlay';
import { PostImageViewerModal } from '../../components/post/PostImageViewerModal';

export function CommunityPostDetailsScreen({ route }: any) {
  const styles = useThemedStyles(buildStyles);
  const post = route.params.post;
  const { width } = useWindowDimensions();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const images: string[] = post.images ?? [];

  return (
    <ScrollView style={styles.container}>
      {images.map((uri: string, index: number) => (
        <Pressable
          key={`${uri}-${index}`}
          onPress={() => setViewerIndex(index)}
          style={styles.image}
          accessibilityRole="imagebutton"
          accessibilityLabel="Open photo">
          <PostPhotoOverlay
            uri={uri}
            width={width}
            height={260}
            brokerName={post.authorName}
          />
        </Pressable>
      ))}

      <View style={styles.content}>
        <Text style={styles.title}>{post.title}</Text>

        <Text style={styles.city}>
          {post.city}
        </Text>

        <Text style={styles.description}>
          {post.description}
        </Text>
      </View>

      <PostImageViewerModal
        images={images}
        startIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        brokerName={post.authorName}
      />
    </ScrollView>
  );
}

const buildStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  image: {
    width: '100%',
    height: 260,
    marginBottom: 8,
  },

  content: {
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
  },

  city: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.6,
  },

  description: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});