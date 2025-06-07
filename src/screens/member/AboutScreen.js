import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AboutScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkForUpdatesOnLoad();
  }, []);

  const checkForUpdatesOnLoad = async () => {
    try {
      if (!Updates.isEnabled) {
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'New Update Available',
          'A new version of Swanidhi is available. Would you like to update now?',
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
                  console.error('Update error:', error);
                  Alert.alert(
                    'Update Failed',
                    'Failed to update the app. Please try again later or update through the app store.'
                  );
                } finally {
                  setUpdating(false);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Check for updates error:', error);
      if (!__DEV__) {
        Alert.alert(
          'Error',
          'Unable to check for updates. Please try again later or update through the app store.'
        );
      }
    }
  };

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      
      // Check if updates are enabled
      if (!Updates.isEnabled) {
        Alert.alert(
          'Updates Not Available',
          'Automatic updates are not enabled for this app. Please update through the app store.'
        );
        return;
      }

      // Check for updates
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
              text: 'Update',
              onPress: async () => {
                try {
                  setUpdating(true);
                  // Fetch the update
                  await Updates.fetchUpdateAsync();
                  // Reload the app with the new update
                  await Updates.reloadAsync();
                } catch (error) {
                  console.error('Update error:', error);
                  Alert.alert(
                    'Update Failed',
                    'Failed to update the app. Please try again later or update through the app store.'
                  );
                } finally {
                  setUpdating(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Up to Date',
          'You are using the latest version of the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Check for updates error:', error);
      // Check if the error is due to development client
      if (__DEV__) {
        Alert.alert(
          'Development Mode',
          'Update checking is not available in development mode. This feature will work in production builds.'
        );
      } else {
        Alert.alert(
          'Error',
          'Unable to check for updates. Please try again later or update through the app store.'
        );
      }
    } finally {
      setChecking(false);
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.appInfo}>
          <Icon name="cash-multiple" size={64} color="#007AFF" />
          <Text style={styles.appName}>Swanidhi</Text>
          <Text style={styles.appDescription}>
            Your trusted financial companion for managing investments and loans
          </Text>
          <Text style={styles.version}>
            Version {Constants.expoConfig.version}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, (checking || updating) && styles.updateButtonDisabled]}
          onPress={checkForUpdates}
          disabled={checking || updating}
        >
          {checking ? (
            <View style={styles.updateButtonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.updateButtonText}>Checking...</Text>
            </View>
          ) : updating ? (
            <View style={styles.updateButtonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.updateButtonText}>Updating...</Text>
            </View>
          ) : (
            <Text style={styles.updateButtonText}>Check for Updates</Text>
          )}
        </TouchableOpacity>

        <View style={styles.links}>
          <TouchableOpacity
            style={styles.link}
            onPress={openPrivacyPolicy}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Icon name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={openTermsOfService}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
            <Icon name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>
          © 2024 Swanidhi. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 30,
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
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  version: {
    fontSize: 14,
    color: '#8E8E93',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  links: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  linkText: {
    fontSize: 16,
    color: '#000000',
  },
  copyright: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 30,
  },
}); 