import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useUpdateCheck = () => {
  const [updating, setUpdating] = useState(false);

  const checkForUpdates = async () => {
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

  useEffect(() => {
    checkForUpdates();
  }, []);

  return { updating };
}; 