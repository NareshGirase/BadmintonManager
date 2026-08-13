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
import { useToast } from '@/src/contexts/ToastContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EditSessionScreen() {
const router = useRouter();
const { user } = useAuth();
const { showToast } = useToast();
const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [courtFee, setCourtFee] = useState('');
const [date, setDate] = useState('');
const [players, setPlayers] = useState<string[]>([]);
const [showDatePicker, setShowDatePicker] = useState(false);

useEffect(() => {
if (sessionId && user) {
loadSession();
}
}, [sessionId, user]);

const loadSession = async () => {
try {
const response = await fetch(
`${BACKEND_URL}/api/sessions/${sessionId}?admin_id=${user?.id}`
);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail || 'Failed to load session'
    );
  }

  setCourtFee(String(data.court_fee ?? ''));
  setDate(data.date ?? '');
  setPlayers(data.players_present ?? []);
} catch (error) {
  console.error('LOAD SESSION ERROR:', error);

  showToast(
  error instanceof Error
    ? error.message
    : 'Failed to load session',
  'error'
);
} finally {
  setLoading(false);
}
};

const parseDate = (dateString: string) => {
if (!dateString) {
return new Date();
}

const [year, month, day] = dateString
  .split('-')
  .map(Number);

return new Date(year, month - 1, day);
};

const formatDateForBackend = (selectedDate: Date) => {
const year = selectedDate.getFullYear();

const month = String(
  selectedDate.getMonth() + 1
).padStart(2, '0');

const day = String(
  selectedDate.getDate()
).padStart(2, '0');

return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (
dateString: string
) => {
if (!dateString) {
return 'Select date';
}

return parseDate(dateString).toLocaleDateString(
  'en-IN',
  {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }
);

};

const handleDateChange = (
event: any,
selectedDate?: Date
) => {
setShowDatePicker(false);

if (selectedDate) {
  setDate(
    formatDateForBackend(selectedDate)
  );
}
};

const updateSession = async () => {
if (saving) {
return;
}

if (!date) {
  showToast(
    'Please select a session date.',
    'error'
  );
  return;
}

if (!courtFee.trim()) {
  showToast(
    'Please enter the court fee.',
    'error'
  );
  return;
}

const fee = Number(courtFee);

if (isNaN(fee) || fee < 0) {
  showToast(
    
    'Please enter a valid court fee.',
    'error'
  );
  return;
}

if (!user?.id) {
  showToast(
    'Admin information is missing.',
    'error',
  );
  return;
}

setSaving(true);

try {
  const response = await fetch(
    `${BACKEND_URL}/api/sessions/${sessionId}?admin_id=${user.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: date,
        court_fee: fee,
        players_present: players,
      }),
    }
  );

  console.log(
    'UPDATE SESSION STATUS:',
    response.status
  );

  const responseText =
    await response.text();

  let data: any = {};

  try {
    data = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    data = {};
  }

  console.log(
    'UPDATE SESSION RESPONSE:',
    data
  );

  if (!response.ok) {
    console.error(
      'UPDATE SESSION ERROR:',
      data
    );

    showToast(
      data?.detail ||
        data?.message ||
        'Failed to update session.',
        'error'
    );

    return;
  }

showToast(
  'Session updated successfully',
  'success'
);
} catch (error) {
  console.error(
    'UPDATE SESSION ERROR:',
    'error'
  );

     showToast(
      'Failed to update session. Please try again.',
      'error'
  );
  } finally {
  setSaving(false);
}
};

if (loading) {
return ( 
<SafeAreaView style={styles.loading}> 
  <ActivityIndicator
       size="large"
       color="#10b981"
     /> 
     </SafeAreaView>
);
}

return (
<SafeAreaView
style={styles.container}
edges={['top']}
>
{/* HEADER */}

  <View style={styles.header}>
    <TouchableOpacity
     onPress={() => router.replace('/sessions')}
      style={styles.backButton}
      activeOpacity={0.7}
    > 
      <Ionicons
        name="arrow-back"
        size={24}
        color="#fff"
      />
    </TouchableOpacity>

    <Text style={styles.headerTitle}>
      Edit Session
    </Text>

    <View style={{ width: 40 }} />
  </View>

  {/* DATE */}

  <Text style={styles.label}>
    Date
  </Text>

  {Platform.OS === 'web' ? (
    <View style={styles.dateInput}>
      <Ionicons
        name="calendar"
        size={20}
        color="#9ca3af"
        style={{
          marginRight: 10,
        }}
      />

      <input
        type="date"
        value={date}
        onChange={(e) =>
          setDate(e.target.value)
        }
        style={{
          flex: 1,
          height: 50,
          backgroundColor:
            'transparent',
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
        onPress={() =>
          setShowDatePicker(true)
        }
        activeOpacity={0.8}
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
          onChange={
            handleDateChange
          }
        />
      )}
    </>
  )}

  {/* COURT FEE */}

  <Text style={styles.label}>
    Court Fee
  </Text>

  <TextInput
    style={styles.input}
    value={courtFee}
    keyboardType="numeric"
    onChangeText={setCourtFee}
    editable={!saving}
    placeholder="Enter court fee"
    placeholderTextColor="#64748b"
  />

  {/* SAVE BUTTON */}

  <TouchableOpacity
    style={[
      styles.button,
      saving &&
        styles.disabledButton,
    ]}
    onPress={updateSession}
    disabled={saving}
    activeOpacity={0.8}
  >
    {saving ? (
      <ActivityIndicator
        color="#fff"
      />
    ) : (
      <Text style={styles.buttonText}>
        Save Changes
      </Text>
    )}
  </TouchableOpacity>
</SafeAreaView>

);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: '#0f172a',
padding: 20,
},

loading: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#0f172a',
},

header: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
marginHorizontal: -20,
paddingHorizontal: 20,
paddingVertical: 16,
borderBottomWidth: 1,
borderBottomColor: '#334155',
marginBottom: 10,
},

backButton: {
width: 40,
height: 40,
justifyContent: 'center',
alignItems: 'center',
},

headerTitle: {
fontSize: 20,
fontWeight: 'bold',
color: '#fff',
},

label: {
color: '#9ca3af',
marginBottom: 8,
marginTop: 15,
},

input: {
backgroundColor: '#1e293b',
color: '#fff',
borderRadius: 10,
padding: 14,
borderWidth: 1,
borderColor: '#334155',
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

button: {
marginTop: 30,
backgroundColor: '#10b981',
padding: 16,
borderRadius: 12,
alignItems: 'center',
},

disabledButton: {
opacity: 0.6,
},

buttonText: {
color: '#fff',
fontSize: 16,
fontWeight: '600',
},
});