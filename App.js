import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform, StyleSheet, FlatList, Switch, TextInput, SafeAreaView, ScrollView, } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SQLite from "expo-sqlite";
import MapView, { Marker } from 'react-native-maps'; // Add this import
import * as Location from 'expo-location';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function openDatabase() {
  
  const db = SQLite.openDatabase("ss.db");
  return db;

}

const db = openDatabase();

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(null);
  const [studyLocations, setStudyLocations] = useState([]);
  const [status, setStatus] = useState(false); // false for "locked in", true for "acting silly"
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "drop table if exists users;"
      );
      tx.executeSql(
        "drop table if exists friendships;"
      );
      tx.executeSql(
        "create table if not exists users (id integer primary key not null, username text, password text);"
      );
      tx.executeSql(
        "create table if not exists friendships (user_id integer, friend_id integer, primary key (user_id, friend_id), foreign key (user_id) references users(id), foreign key (friend_id) references users(friend_id));"
      );
    });
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO users (id, username, password)"+
        "SELECT 1, 'nadiaa', 'password';"
      );
      tx.executeSql(
        "INSERT INTO users (id, username, password)"+
        "SELECT 2, 'andrew', 'password';"
      );
      tx.executeSql(
        "INSERT INTO friendships (user_id, friend_id)"+
        "SELECT 1, 2;"
      );
    });
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update when the user has moved at least 10 meters
        },
        async (location) => {
          if (isMounted) {
            console.log('Received location:', location);
            setCurrentLocation(location);

            try {
              const address = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });

              if (address && address.length > 0) {
                setLocationAddress(address[0]);
              }
            } catch (error) {
              console.error('Error fetching address:', error);
            }
          }
        }
      );

      return () => {
        isMounted = false;
        locationSubscription.remove();
      };
    };

    startLocationUpdates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddLocation = () => {
    if (locationAddress && customName !== '') {
      setStudyLocations([...studyLocations, { name: customName, address: locationAddress }]);
      setCustomName(''); // Clear the customName input field after adding the location
    }
  };

  const handleDeleteLocation = (index) => {
    const updatedLocations = [...studyLocations];
    updatedLocations.splice(index, 1);
    setStudyLocations(updatedLocations);
  };

  const handleStatusToggle = () => {
    if (status)
      schedulePushNotification("Friend in need", "Nadia is studying at Seibel");
    setStatus((prevStatus) => !prevStatus);
  };

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView style={styles.scrollView}>
    <View
      style={styles.container}>
      <View style={[styles.statusContainer, { backgroundColor: status ? '#ed4239' : '#82f562' }]}>
        <Text style={styles.statusText}>{status ? 'Dilly Dallying' : 'Locked In'}</Text>
        <Button title={status ? '👎' : '👍'} onPress={handleStatusToggle} />
      </View>
      <Text style={styles.heading}>Current Location:</Text>
      {locationAddress && (
        <Text style={styles.text}>
          Address: {locationAddress.name}, {locationAddress.street}, {locationAddress.city}, {locationAddress.region}
        </Text>
      )}
      {currentLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
            title="Current Location"
          />
        </MapView>
      )}
      <TextInput
        style={styles.input}
        value={customName}
        onChangeText={setCustomName}
        placeholder="Enter custom name for location"
      />
      <Button title="Add Location" onPress={handleAddLocation} />
      <FlatList
        data={studyLocations}
        renderItem={({ item, index }) => (
          <View style={styles.studyLocation}>
            <Text>{item.name}</Text>
            <Button title="Delete" onPress={() => handleDeleteLocation(index)} />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
    </ScrollView>
    </SafeAreaView>
  );
}

async function schedulePushNotification(title, text) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title ?? "Empty Title",
      body: text ?? 'Empty Body',
    },
    trigger: { seconds: 1 },
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })).data;
    console.log(token);

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    paddingTop: 40,
    margin: 20,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 20,
    padding: 10,
    paddingTop: 50,
    paddingBottom: 60,
    fontSize: 40,
    color: 'white', // Text color
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
    margin: 0,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    borderRadius: 20,
  },
  studyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 5,
  },
  map: {
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  scrollView: {
    backgroundColor: 'white',
    marginHorizontal: -5,
  },

});