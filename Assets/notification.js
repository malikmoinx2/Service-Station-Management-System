import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { UserContext } from "./UserContext";
import { BASE_URL } from "./Constants";

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { User } = useContext(UserContext);

  const fetchNotifications = async () => {
    try {
      const url = `${BASE_URL}/Customer/my-notifications/${User.id}`;
      const response = await fetch(url);
      const result = await response.json();
      setNotifications(result);
    } catch (error) {
      console.log("Fetch Notifications Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (User?.id) {
      fetchNotifications();
    }
  }, [User]);

  const handleNotificationClick = async (notificationId, isRead) => {
    // Agar pehle se read hai to API call ki zaroorat nahi
    if (isRead) return;

    try {
      const response = await fetch(`${BASE_URL}/Customer/mark-as-read/${notificationId}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Local state update karein taaki foran dot gayab ho jaye
        setNotifications(prev => 
          prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.log("Error marking as read:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const renderItem = ({ item }) => {
    let statusColor = 'lightgray';
    const title = item.title || "";
    
    if (title.includes("Confirmed") || title.includes("Placed")) statusColor = "green";
    else if (title.includes("Cancelled") || title.includes("Rejected")) statusColor = "red";
    else if (title.includes("Accepted") || title.includes("Done")) statusColor = "deepskyblue";

    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          { borderLeftColor: statusColor, opacity: item.isRead ? 0.7 : 1 }
        ]}
        onPress={() => handleNotificationClick(item.notificationId, item.isRead)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <Text style={[styles.titleText, { fontWeight: item.isRead ? 'normal' : 'bold' }]}>
              {item.title}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.message}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerArea}>
        <Text style={styles.mainTitle}>Notifications</Text>
        <Text style={styles.subTitle}>Latest updates</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="deepskyblue" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.notificationId.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={styles.emptyText}>No notifications to show</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  headerArea: { paddingHorizontal: 30, paddingTop: 50, paddingBottom: 20, backgroundColor: 'white' },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: 'black' },
  subTitle: { fontSize: 14, color: 'gray', marginTop: 5 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 25, paddingVertical: 10 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 5,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginRight: 8 },
  titleText: { fontSize: 16, color: 'black' },
  timeText: { fontSize: 11, color: 'gray' },
  messageText: { fontSize: 14, color: '#555', lineHeight: 20 },
  emptyView: { marginTop: 100, alignItems: 'center' },
  emptyText: { fontSize: 16, color: 'lightgray' },
});