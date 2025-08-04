import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkAndNotifyUpcomingTasks, clearNotificationCache } from '@/lib/utils/notifications';

const NOTIFICATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INITIAL_DELAY = 10 * 1000; // 10 seconds after login

export function useTaskNotifications() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedTasks = useRef<Set<string>>(new Set());

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
      notifiedTasks.current.clear();
    };
  }, [user?.id]);

  // Clear notifications when user changes
  useEffect(() => {
    clearNotificationCache();
  }, [user?.id]);
}