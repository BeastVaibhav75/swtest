import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fundAPI } from '../../services/api';

export default function ShareValueGrowthScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareData, setShareData] = useState({
    currentValue: 0,
    growthPercentage: 0,
    history: []
  });

  const fetchShareData = async () => {
    try {
      setLoading(true);
      const shareValueRes = await fundAPI.getShareValue();
      
      setShareData({
        currentValue: shareValueRes.data?.shareValue || 0,
        growthPercentage: shareValueRes.data?.growthPercentage || 0,
        history: shareValueRes.data?.history || []
      });
    } catch (error) {
      console.error('Error fetching share value data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShareData();
  }, []);

  React.useEffect(() => {
    fetchShareData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Share Value Growth</Text>
      </View>
      <View style={styles.valueSection}>
        <Text style={styles.valueText}>
          ₹{shareData.currentValue.toFixed(2)} 
          <Text style={[
            styles.growthText,
            { color: shareData.growthPercentage >= 0 ? '#34C759' : '#FF3B30' }
          ]}>
            {shareData.growthPercentage >= 0 ? '+' : ''}{shareData.growthPercentage}%
          </Text>
        </Text>
        <Text style={styles.valueLabel}>Current Share Value</Text>
      </View>
      <View style={styles.graphSection}>
        <Text style={styles.graphLabel}>Growth Graph (Monthly/Yearly)</Text>
        {shareData.history.length === 0 ? (
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphPlaceholderText}>No data available</Text>
          </View>
        ) : (
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphPlaceholderText}>[Graph Placeholder]</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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