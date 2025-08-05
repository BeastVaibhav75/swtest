import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountOptions, setAccountOptions] = useState([]);
  const { loginByPhone, loading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    try {
      const result = await loginByPhone(phone, password);
      if (result && result.accounts && result.accounts.length > 1) {
        setAccountOptions(result.accounts);
        setShowAccountModal(true);
      } else if (result && result.accounts && result.accounts.length === 1) {
        // Only one account, already logged in
        navigation.reset({
          index: 0,
          routes: [{ name: result.accounts[0].role === 'admin' ? 'Main' : 'MemberHome' }],
        });
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleAccountSelect = async (account) => {
    setShowAccountModal(false);
    try {
      const userData = await loginByPhone(phone, password, account.memberId);
      navigation.reset({
        index: 0,
        routes: [{ name: userData.role === 'admin' ? 'Main' : 'MemberHome' }],
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid credentials');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Swanidhi</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: 'black' }]}
          placeholder="Phone Number"
          placeholderTextColor="black"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, { color: 'black' }]}
            placeholder="Password"
            placeholderTextColor="black"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            <Text style={styles.eyeIconText}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account Selection Modal */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Account</Text>
            <FlatList
              data={accountOptions}
              keyExtractor={item => item.memberId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() => handleAccountSelect(item)}
                >
                  <Text style={styles.accountName}>{item.name} ({item.memberId})</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50, // Make space for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  eyeIconText: {
    fontSize: 20,
    lineHeight: 20, // Match the font size to prevent vertical offset
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  accountItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accountName: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
  },
}); 