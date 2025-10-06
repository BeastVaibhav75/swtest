import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { api } from '../services/api';

export const useUpdateCheck = () => {
  const [updating, setUpdating] = useState(false);

  // Accept options for auto/manual and state setters
  const checkForUpdates = async ({ auto = false, setChecking, setUpdating: setUpdatingExternal } = {}) => {
    let apiCheckFailed = false;
    try {
      if (setChecking) setChecking(true);
      // First try OTA updates (for development/preview builds)
      if (Updates.isEnabled) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            'New Update Available',
            'A new version of Swanidhi is available. Would you like to update now?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Update Now',
                onPress: async () => {
                  try {
                    if (setUpdatingExternal) setUpdatingExternal(true);
                    setUpdating(true);
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (error) {
                    console.error('Update error:', error);
                    Alert.alert('Update Failed', 'Failed to update the app. Please try again later or update through the app store.');
                  } finally {
                    if (setUpdatingExternal) setUpdatingExternal(false);
                    setUpdating(false);
                  }
                },
              },
            ]
          );
          return;
        }
      }
      // Fallback: Check for APK updates (for production builds)
      try {
        const currentVersion = require('../../app.json').expo.version;
        const response = await api.get('/version');
        const latestVersion = response.data.version;
        const downloadUrl = response.data.downloadUrl;
        if (latestVersion !== currentVersion) {
          Alert.alert(
            'Update Required',
            `A new version (${latestVersion}) of Swanidhi is available. The current version will no longer work. Please download the new version.`,
            [
              {
                text: 'Download Now',
                onPress: () => {
                  const fallbackUrl = 'https://beastvaibhav75.github.io/Swanidhi_Download/';
                  Linking.openURL(downloadUrl || fallbackUrl);
                },
              },
            ],
            { cancelable: false }
          );
        } else if (!auto) {
          Alert.alert('Up to Date', 'You are using the latest version of the app.', [{ text: 'OK' }]);
        }
      } catch (apiError) {
        console.error('API version check error:', apiError);
        apiCheckFailed = true;
      }
      // If API check failed and this was a manual check, show error
      if (apiCheckFailed && !auto) {
        Alert.alert(
          'Unable to Check for Updates',
          'Please try again later. You can also download the latest APK from our website.',
          [
            {
              text: 'Open Download Page',
              onPress: () => Linking.openURL('https://beastvaibhav75.github.io/Swanidhi_Download/'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Check for updates error:', error);
      if (!__DEV__) {
        Alert.alert(
          'Error',
          'Unable to check for updates. You can download the latest APK from our website.',
          [
            {
              text: 'Open Download Page',
              onPress: () => Linking.openURL('https://beastvaibhav75.github.io/Swanidhi_Download/'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } finally {
      if (setChecking) setChecking(false);
    }
  };

  // No auto check in hook, let screen call it with options
  return { updating, checkForUpdates };
}; 