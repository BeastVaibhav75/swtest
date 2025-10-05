import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { maintenanceAPI } from '../../services/api';

export default function MaintenanceScreen() {
  const [message, setMessage] = useState('The app is under maintenance.');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await maintenanceAPI.getStatus();
        if (res?.data?.message) {
          setMessage(res.data.message);
        }
      } catch (e) {
        // keep default message on error
      }
    };
    fetchStatus();
  }, []);

  const handleCloseApp = () => {
    Alert.alert(
      'Exit',
      'Close the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Maintenance Mode</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={handleCloseApp}>
          <Text style={styles.buttonText}>Close App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFFFFF', padding: 24, margin: 16, borderRadius: 12, width: '90%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: '#333', marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});


