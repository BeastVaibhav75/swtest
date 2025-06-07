import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AboutScreen({ navigation }) {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  const checkForUpdates = async () => {
    try {
      setCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Would you like to update now?',
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  setUpdating(true);
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error('Error updating app:', error);
                  Alert.alert('Error', 'Failed to update the app. Please try again later.');
                } finally {
                  setUpdating(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('No Updates', 'You are using the latest version of the app.');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert('Error', 'Failed to check for updates. Please try again later.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://swanidhi.com/privacy-policy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://swanidhi.com/terms-of-service');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.appInfo}>
          <Icon name="bank" size={64} color="#007AFF" />
          <Text style={styles.appName}>Swanidhi</Text>
          <Text style={styles.appDescription}>Loan Management System</Text>
          <Text style={styles.version}>Version {currentVersion}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={checkForUpdates}
            disabled={checkingUpdate || updating}
          >
            {checkingUpdate || updating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="update" size={24} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>
                  {checkingUpdate ? 'Checking...' : updating ? 'Updating...' : 'Check for Updates'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.linkItem} onPress={openPrivacyPolicy}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Icon name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkItem} onPress={openTermsOfService}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Icon name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Swanidhi. All rights reserved.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  appInfo: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
  },
  appDescription: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  version: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
}); 