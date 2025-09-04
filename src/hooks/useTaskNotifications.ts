import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkAndNotifyUpcomingTasks, clearNotificationCache, requestNotificationPermission, subscribeToTaskUpdates } from '@/lib/utils/notifications';

const NOTIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INITIAL_DELAY = 10 * 1000; // 10 seconds after login

export function useTaskNotifications() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());

  // Request notification permissions when component mounts
  useEffect(() => {
    requestNotificationPermission().then((permission) => {
      console.log('Notification permission:', permission);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const checkTasks = async () => {
      try {
        await checkAndNotifyUpcomingTasks(user.id);
      } catch (error) {
        console.error('Error in task notifications:', error);
      }
    };

    // Subscribe to real-time task updates
    subscribeToTaskUpdates(user.id, (payload) => {
      console.log('Real-time task update:', payload);
    }).then((unsubscribe) => {
      subscriptionRef.current = unsubscribe;
    });

    // Initial check after a short delay
    const initialTimeout = setTimeout(() => {
      checkTasks();
    }, INITIAL_DELAY);

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      checkTasks();
    }, NOTIFICATION_INTERVAL);

    return () => {
      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
      notifiedTasks.current.clear();
    };
  }, [user?.id]);

  // Clear notifications when user changes
  useEffect(() => {
    clearNotificationCache();
  }, [user?.id]);
}