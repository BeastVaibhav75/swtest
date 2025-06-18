import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { api } from '../services/api';

export const useUpdateCheck = () => {
  const [updating, setUpdating] = useState(false);

  const checkForUpdates = async () => {
    try {
      // First try OTA updates (for development/preview builds)
      if (Updates.isEnabled) {
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
          return; // Exit if OTA update is available
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
                  if (downloadUrl) {
                    Linking.openURL(downloadUrl);
                  } else {
                    Alert.alert(
                      'Download Link',
                      'Please contact the administrator for the latest APK file.'
                    );
                  }
                },
              },
            ],
            { cancelable: false } // Prevents dismissing by tapping outside
          );
        }
      } catch (apiError) {
        console.error('API version check error:', apiError);
        // Don't show error to users for API version checks
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

  useEffect(() => {
    checkForUpdates();
  }, []);

  return { updating };
}; 