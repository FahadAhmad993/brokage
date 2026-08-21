/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, View } from 'react-native';

test('renders a basic React Native tree', () => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <View>
        <Text>Brokage</Text>
      </View>,
    );
  });
  expect(tree!.toJSON()).toBeTruthy();
});
