// HomeScreen.js
import React from 'react';
import { View, Text, Button } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <View>
      <Text>Home Screen</Text>
      <Button
        title="Go to Stats Screen"
        onPress={() => navigation.navigate('Stats')}
      />
    </View>
  );
};

export default HomeScreen;