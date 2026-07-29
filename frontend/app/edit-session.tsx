import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';

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

      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
      />


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