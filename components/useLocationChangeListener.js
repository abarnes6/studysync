import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

const BACKGROUND_TASK_NAME = 'background-location-task';

const useLocationChangeListener = (callback, active = true) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    let isSubscribed = false;

    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 5000,
        });
        isSubscribed = true;
      } catch (error) {
        console.error('Error starting location updates:', error);
      }
    };

    const handleLocationUpdate = (location) => {
      setCurrentLocation(location);
      callback(location);
    };

    const locationSubscription = Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 10,
    }, handleLocationUpdate);

    if (active) {
      startLocationUpdates();
    }

    return () => {
      isSubscribed = false;
      Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
      locationSubscription.remove();
    };
  }, [active]);

  return currentLocation;
};

export default useLocationChangeListener;
