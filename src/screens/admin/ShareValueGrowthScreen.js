import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ShareValueGrowthScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Share Value Growth</Text>
      </View>
      <View style={styles.valueSection}>
        <Text style={styles.valueText}>
          ₹5000 <Text style={styles.growthText}>+50%</Text>
        </Text>
        <Text style={styles.valueLabel}>Current Share Value</Text>
      </View>
      <View style={styles.graphSection}>
        <Text style={styles.graphLabel}>Growth Graph (Monthly/Yearly)</Text>
        <View style={styles.graphPlaceholder}>
          <Text style={styles.graphPlaceholderText}>[Graph Placeholder]</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 16,
  },
  valueSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  valueText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  growthText: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: 'bold',
    textAlignVertical: 'top',
  },
  valueLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  graphSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  graphLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  graphPlaceholder: {
    height: 220,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphPlaceholderText: {
    color: '#999',
    fontSize: 16,
    fontStyle: 'italic',
  },
}); 