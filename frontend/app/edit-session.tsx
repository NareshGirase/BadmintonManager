import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EditSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [courtFee, setCourtFee] = useState('');
  const [date, setDate] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
  if(sessionId && user){
    loadSession();
  }
}, [sessionId, user]);

  const loadSession = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}?admin_id=${user?.id}`
      );

      const data = await response.json();

      setCourtFee(String(data.court_fee ?? ''));
      setDate(data.date ?? '');
      setPlayers(data.players_present ?? []);

    } catch (error) {
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };
  const parseDate = (dateString: string) => {
  if (!dateString) {
    return new Date();
  }

  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
};

  const formatDateForBackend = (selectedDate: Date) => {
  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) {
    return 'Select date';
  }

  return parseDate(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const handleDateChange = (
  event: any,
  selectedDate?: Date
) => {
  setShowDatePicker(false);

  if (selectedDate) {
    setDate(formatDateForBackend(selectedDate));
  }
};

  const updateSession = async () => {
    setSaving(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/sessions/${sessionId}?admin_id=${user?.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          date: date,
          court_fee: Number(courtFee),
          players_present: players,
         }),
        }
      );
    console.log("Status:", response.status);

    const data = await response.json();
    console.log("Response:", data);
      
    if (response.ok) {
  Alert.alert('Success', 'Session updated successfully');

  setTimeout(() => {
    router.back();
  }, 1000);
} else {
      Alert.alert("Error", JSON.stringify(data));
    }
  } catch (e) {
    console.log(e);
    Alert.alert("Error", String(e));
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }


  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>
        Edit Session
      </Text>


<Text style={styles.label}>
  Date
</Text>

{Platform.OS === 'web' ? (
  <View style={styles.dateInput}>
    <Ionicons
      name="calendar"
      size={20}
      color="#9ca3af"
      style={{ marginRight: 10 }}
    />

    <input
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      style={{
        flex: 1,
        height: 50,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        color: '#fff',
        fontSize: 16,
        fontFamily: 'inherit',
        colorScheme: 'dark',
      }}
    />
  </View>
) : (
  <>
    <TouchableOpacity
      style={styles.dateInput}
      onPress={() => setShowDatePicker(true)}
      activeOpacity={0.7}
    >
      <Text style={styles.dateText}>
        {formatDateForDisplay(date)}
      </Text>

      <Ionicons
        name="calendar"
        size={20}
        color="#9ca3af"
      />
    </TouchableOpacity>

    {showDatePicker && (
      <DateTimePicker
        value={parseDate(date)}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    )}
  </>
)}

      <Text style={styles.label}>
        Court Fee
      </Text>

      <TextInput
        style={styles.input}
        value={courtFee}
        keyboardType="numeric"
        onChangeText={setCourtFee}
      />


      <TouchableOpacity
        style={styles.button}
        onPress={updateSession}
        disabled={saving}
      >
        {
          saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Save Changes
            </Text>
          )
        }
      </TouchableOpacity>


    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:'#0f172a',
    padding:20,
  },

  loading:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor:'#0f172a',
  },

  title:{
    color:'#fff',
    fontSize:28,
    fontWeight:'bold',
    marginBottom:30,
  },

  label:{
    color:'#9ca3af',
    marginBottom:8,
    marginTop:15,
  },

  input:{
    backgroundColor:'#1e293b',
    color:'#fff',
    borderRadius:10,
    padding:14,
    borderWidth:1,
    borderColor:'#334155',
  },

  dateInput: {
  backgroundColor: '#1e293b',
  borderRadius: 10,
  padding: 14,
  borderWidth: 1,
  borderColor: '#334155',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

dateText: {
  color: '#fff',
  fontSize: 16,
},

  button:{
    marginTop:30,
    backgroundColor:'#10b981',
    padding:16,
    borderRadius:12,
    alignItems:'center',
  },

  buttonText:{
    color:'#fff',
    fontSize:16,
    fontWeight:'600',
  },

});