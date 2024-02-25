import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, FlatList, Switch, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps'; // Add this import
import * as Location from 'expo-location';

export default function HomeScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(null);
  const [studyLocations, setStudyLocations] = useState([]);
  const [status, setStatus] = useState(false); // false for "locked in", true for "acting silly"
  const [customName, setCustomName] = useState('');

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
    setStatus((prevStatus) => !prevStatus);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusContainer, { backgroundColor: status ? 'red' : 'green' }]}>
        <Text style={styles.statusText}>{status ? 'Acting Silly' : 'Locked In'}</Text>
        <Button title={status ? '👎' : '👍'} onPress={handleStatusToggle} />
      </View>
      <Text style={styles.heading}>Current Location:</Text>
      {locationAddress && (
        <Text style={styles.text}>
          Address: {locationAddress.name}, {locationAddress.street}, {locationAddress.city}, {locationAddress.region}, {locationAddress.postalCode}, {locationAddress.country}
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
            <Text>{item.name}, {item.address.street}, {item.address.city}</Text>
            <Button title="Delete" onPress={() => handleDeleteLocation(index)} />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
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
    margin: 40,
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
});

