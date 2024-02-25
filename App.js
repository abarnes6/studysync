import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SQLite from "expo-sqlite";

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



  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}>
      <Text>Your expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to schedule a notification"
        onPress={async () => {
          await schedulePushNotification();
        }}
      />
      <Button
        title="Press to view the database"
        onPress={async () => {
          db.transaction((tx) => {
            tx.executeSql("select * from users", [], (_, { rows }) =>
              schedulePushNotification("users", JSON.stringify(rows['_array']))
            );
          });
        }}
        
      />
    
    </View>
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
