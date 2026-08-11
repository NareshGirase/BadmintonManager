import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number
  ) => void;
  hideToast: () => void;
}

const ToastContext = createContext<
  ToastContextType | undefined
>(undefined);

export const ToastProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');

  const slideAnim = useRef(
    new Animated.Value(-100)
  ).current;

  const hideTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const hideToast = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const showToast = (
    newMessage: string,
    newType: ToastType = 'info',
    duration = 3000
  ) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    setMessage(newMessage);
    setType(newType);
    setVisible(true);

    slideAnim.setValue(-100);

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    hideTimer.current = setTimeout(() => {
      hideToast();
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const getToastColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';

      case 'error':
        return '#ef4444';

      case 'warning':
        return '#f59e0b';

      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';

      case 'error':
        return 'close-circle';

      case 'warning':
        return 'warning';

      case 'info':
      default:
        return 'information-circle';
    }
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
      }}
    >
      {children}

      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: getToastColor(),
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}
        >
          <Ionicons
            name={getIconName() as any}
            size={24}
            color="#fff"
          />

          <Text style={styles.toastText}>
            {message}
          </Text>

          <TouchableOpacity
            onPress={hideToast}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      'useToast must be used inside ToastProvider'
    );
  }

  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    marginRight: 8,
  },

  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});