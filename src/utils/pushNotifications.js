// src/utils/pushNotifications.js
// Utility functions for triggering push notifications

import { supabase } from '../supabase';

/**
 * Send push notifications to multiple users
 * @param {Object} params
 * @param {string[]} params.userIds - Array of user IDs to notify
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body text
 * @param {string} params.notificationType - Type of notification (daily_brief, action_items, etc)
 * @param {string} [params.url] - URL to navigate to when notification is clicked
 * @param {string} [params.tag] - Notification tag for grouping/replacing
 * @returns {Promise<{success: boolean, sent?: number, error?: string}>}
 */
export async function sendPushNotification({
  userIds,
  title,
  body,
  notificationType,
  url = '/',
  tag = null
}) {
  try {
    // Validate inputs
    if (!userIds || userIds.length === 0) {
      console.warn('[Push] No user IDs provided');
      return { success: false, error: 'No user IDs provided' };
    }

    if (!title || !body || !notificationType) {
      console.warn('[Push] Missing required fields');
      return { success: false, error: 'Missing required fields' };
    }

    console.log(`[Push] Sending "${notificationType}" notification to ${userIds.length} users`);

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        user_ids: userIds,
        title,
        body,
        url,
        tag,
        notification_type: notificationType
      }
    });

    if (error) {
      console.error('[Push] Error invoking function:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Push] Successfully sent to ${data.sent} users`);
    return { success: true, sent: data.sent };

  } catch (err) {
    console.error('[Push] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all parent user IDs for a team or group of swimmers
 * @param {string[]} swimmerIds - Array of swimmer IDs
 * @returns {Promise<string[]>} Array of parent user IDs
 */
export async function getParentUserIds(swimmerIds) {
  try {
    if (!swimmerIds || swimmerIds.length === 0) {
      return [];
    }

    // Get parent_id from swimmer_parents table
    console.log(`[Push] Querying swimmer_parents for ${swimmerIds.length} swimmer IDs`);
    const { data: swimmerParents, error: spError } = await supabase
      .from('swimmer_parents')
      .select('parent_id, swimmer_id')
      .in('swimmer_id', swimmerIds);

    if (spError) {
      console.error('[Push] Error fetching parent IDs from swimmer_parents:', spError);
      console.error('[Push] Error details:', JSON.stringify(spError));
      return [];
    }

    console.log(`[Push] Found ${swimmerParents?.length || 0} swimmer-parent links`);
    
    if (!swimmerParents || swimmerParents.length === 0) {
      console.log('[Push] No parent links found - this might be an RLS issue');
      return [];
    }

    // Get unique parent IDs
    const uniqueParentIds = [...new Set(swimmerParents.map(sp => sp.parent_id))];

    // Now get the user_id for each parent from the parents table
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('user_id')
      .in('id', uniqueParentIds);

    if (parentsError) {
      console.error('[Push] Error fetching user IDs from parents:', parentsError);
      return [];
    }

    // Return the user_ids (needed for push subscriptions)
    const userIds = parents?.map(p => p.user_id).filter(Boolean) || [];
    console.log(`[Push] Found ${userIds.length} parent user IDs for ${swimmerIds.length} swimmers`);
    return userIds;

  } catch (err) {
    console.error('[Push] Error getting parent IDs:', err);
    return [];
  }
}

/**
 * Notify parents about a new Daily Brief post
 * @param {Object} post - The Daily Brief post
 * @param {string[]} swimmerIds - Swimmer IDs to notify parents of
 */
export async function notifyDailyBrief(post, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for Daily Brief');
    return;
  }

  return sendPushNotification({
    userIds: parentIds,
    title: `📢 ${post.type.charAt(0).toUpperCase() + post.type.slice(1)}: ${post.title}`,
    body: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
    notificationType: 'daily_brief',
    url: '/parent/daily-brief',
    tag: `daily-brief-${post.id}`
  });
}

/**
 * Notify parents about action items requiring confirmation
 * @param {Object} meet - The meet requiring confirmation
 * @param {string[]} swimmerIds - Swimmer IDs requiring confirmation
 */
export async function notifyActionRequired(meet, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for action items');
    return;
  }

  return sendPushNotification({
    userIds: parentIds,
    title: '⚠️ Action Required',
    body: `Please confirm your swimmer's events for ${meet.meet_name}`,
    notificationType: 'action_items',
    url: '/parent/action-center',
    tag: `meet-confirm-${meet.id}`
  });
}

/**
 * Notify parents about new meet results
 * @param {string} meetName - Name of the meet
 * @param {string[]} swimmerIds - Swimmers who competed
 */
export async function notifyMeetResults(meetName, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for meet results');
    return;
  }

  return sendPushNotification({
    userIds: parentIds,
    title: '🏊 Meet Results Available',
    body: `Results for ${meetName} have been uploaded!`,
    notificationType: 'meet_results',
    url: '/parent/meets',
    tag: `meet-results-${Date.now()}`
  });
}

/**
 * Notify parents about new test set results
 * @param {Object} testSet - The test set data
 * @param {string[]} swimmerIds - Swimmers who participated
 */
export async function notifyTestSetResults(testSet, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for test set');
    return;
  }

  return sendPushNotification({
    userIds: parentIds,
    title: '⏱️ New Test Set Results',
    body: `${testSet.set_name} results are now available`,
    notificationType: 'test_set_results',
    url: '/parent/dashboard',
    tag: `test-set-${testSet.id}`
  });
}

/**
 * Notify parents about practice schedule changes
 * @param {string} message - The change message
 * @param {string[]} swimmerIds - Affected swimmers
 */
export async function notifyPracticeUpdate(message, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for practice update');
    return;
  }

  return sendPushNotification({
    userIds: parentIds,
    title: '📅 Practice Update',
    body: message,
    notificationType: 'practice_updates',
    url: '/parent/calendar',
    tag: `practice-update-${Date.now()}`
  });
}

/**
 * Notify about upcoming meet reminders
 * @param {Object} meet - The upcoming meet
 * @param {string[]} swimmerIds - Swimmers registered
 */
export async function notifyMeetReminder(meet, swimmerIds) {
  const parentIds = await getParentUserIds(swimmerIds);
  
  if (parentIds.length === 0) {
    console.log('[Push] No parents to notify for meet reminder');
    return;
  }

  const meetDate = new Date(meet.meet_date);
  const formattedDate = meetDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  return sendPushNotification({
    userIds: parentIds,
    title: '🏊 Meet Reminder',
    body: `${meet.meet_name} is coming up on ${formattedDate}`,
    notificationType: 'meet_reminders',
    url: '/parent/meets',
    tag: `meet-reminder-${meet.id}`
  });
}

