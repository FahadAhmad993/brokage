import React from 'react';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function CommunityPostDetailsScreen({ route }: any) {
  const styles = useThemedStyles(buildStyles);
  const post = route.params.post;

  return (
    <ScrollView style={styles.container}>
      {post.images?.map((uri: string, index: number) => (
        <Image
          key={`${uri}-${index}`}
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
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